import db from "@/database/db";
import amqp from "amqplib";
import { eq } from "drizzle-orm";
import * as authSchema from "../database/schema/auth";
import { auth } from "./auth";

const EXCHANGE = "ws_events";
const SEND_QUEUE = "ws_events_send";
const RECEIVE_QUEUE = "ws_events_receive";

class RabbitMQService {
  private connection?: amqp.Connection;
  private channel?: amqp.Channel;

  async initialize() {
    try {
      this.connection = await amqp.connect("amqp://localhost:5672");
      this.channel = await this.connection.createChannel();

      // Delete existing exchange if it exists
      try {
        await this.channel.deleteExchange(EXCHANGE);
      } catch (error) {
        console.log("Exchange doesn't exist yet, creating new one");
      }

      console.log("Creating exchange:", EXCHANGE);
      await this.channel.assertExchange(EXCHANGE, "direct", { durable: false });

      // Declare queues with specific names for auth service
      const authQueue = await this.channel.assertQueue("auth_service_queue", {
        durable: false,
        autoDelete: true,
      });
      console.log("Created auth queue:", authQueue.queue);

      const wsQueue = await this.channel.assertQueue("ws_service_queue", {
        durable: false,
        autoDelete: true,
      });
      console.log("Created ws queue:", wsQueue.queue);

      // Bind queues with specific routing keys
      await this.channel.bindQueue(authQueue.queue, EXCHANGE, "auth");
      console.log("Bound auth queue to exchange with key: auth");

      await this.channel.bindQueue(wsQueue.queue, EXCHANGE, "ws");
      console.log("Bound ws queue to exchange with key: ws");

      // Set prefetch to 1 to ensure fair distribution
      await this.channel.prefetch(1);

      // Initialize auth service handlers
      await this.initializeAuthService();

      console.log("🐰 Connected to RabbitMQ and set up queues");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
      throw error;
    }
  }

  private async initializeAuthService() {
    // Set up auth:request_user handler
    await this.subscribeEvent(
      "auth:request_user",
      async (data: { user_id: string; reply_to: string }) => {
        console.log(`Received auth:request_user for ${data.user_id}`);

        try {
          const user = await db
            .select()
            .from(authSchema.user)
            .where(eq(authSchema.user.id, data.user_id))
            .limit(1);

          if (user?.[0]) {
            console.log(
              `Found user data for ${data.user_id}, sending auth:success`
            );
            await this.publishEvent("auth:success", {
              ...user[0],
              session: {
                userId: data.user_id,
              },
            });
          } else {
            console.log(`No user found for ID: ${data.user_id}`);
          }
        } catch (error) {
          console.error(`Error fetching user data:`, error);
        }
      }
    );

    // Listen for auth:login events
    await this.subscribeEvent("auth:login", async (data) => {
      console.log(`Received auth:login event:`, data);
      // Forward the login data as auth:success to ws queue
      await this.publishEvent("auth:success", {
        ...data[0],
        session: {
          userId: data[0]?.id,
        },
      });
    });

    console.log("🔐 Auth service handlers initialized");
  }

  async subscribeEvent(opcode: string, callback: (data: any) => Promise<void>) {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    try {
      // Use the appropriate queue based on the service
      const queueName = opcode.startsWith("auth:")
        ? "auth_service_queue"
        : "ws_service_queue";

      console.log(
        `Setting up subscription for ${opcode} on queue ${queueName}`
      );

      // Start consuming messages
      await this.channel.consume(queueName, async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          console.log(`Received message on ${queueName}:`, content);

          // Check if this message matches our opcode
          if (content.op === opcode) {
            console.log(`Processing ${opcode} message:`, content.p);
            await callback(content.p);
          }

          // Acknowledge the message
          this.channel?.ack(msg);
        } catch (error) {
          console.error(`Error processing message for ${opcode}:`, error);
          // Reject the message and don't requeue it
          this.channel?.reject(msg, false);
        }
      });

      console.log(`🎧 Subscribed to ${opcode} events on ${queueName}`);
    } catch (error) {
      console.error(`Failed to subscribe to ${opcode} events:`, error);
      throw error;
    }
  }

  async publishEvent(opcode: string, payload: any, ref?: string) {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    try {
      const message = {
        op: opcode,
        p: payload,
        v: "1",
        ...(ref ? { ref } : {}),
      };

      // Use routing key based on message type
      let routingKey = "auth";

      // Send auth:success messages to ws queue for client updates
      if (opcode === "auth:success") {
        routingKey = "ws";
      } else if (opcode.startsWith("auth:")) {
        routingKey = "auth";
      } else {
        routingKey = "ws";
      }

      console.log(`Publishing ${opcode} event to ${routingKey}:`, payload);

      await this.channel.publish(
        EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(message))
      );

      console.log(`Published ${opcode} event with routing key ${routingKey}`);
    } catch (error) {
      console.error("Failed to publish event:", error);
      throw error;
    }
  }

  // Helper methods for different message types
  async sendAuthEvent(type: string, payload: any) {
    return this.publishEvent(`auth:${type}`, payload);
  }

  async sendGuildEvent(type: string, payload: any) {
    return this.publishEvent(`guild:${type}`, payload);
  }

  async sendChatEvent(type: string, payload: any) {
    return this.publishEvent(`chat:${type}`, payload);
  }

  async sendFriendEvent(type: string, payload: any) {
    return this.publishEvent(`friend:${type}`, payload);
  }

  async getUserSession(userId: string) {
    return this.subscribeEvent(
      "auth:request_user",
      async (data: { user_id: string; reply_to: string }) => {
        console.log(`Received request for user data: ${data.user_id}`);

        try {
          const user = await db
            .select()
            .from(authSchema.user)
            .where(eq(authSchema.user.id, data.user_id))
            .limit(1);

          if (user?.[0]) {
            await this.publishEvent(data.reply_to, user[0]);
            console.log(`Sent user data for ${data.user_id}`);
          } else {
            console.log(`No user found for ID: ${data.user_id}`);
          }
        } catch (error) {
          console.error(`Error fetching user data: ${error}`);
        }
      }
    );
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log("Closed RabbitMQ connection");
    } catch (error) {
      console.error("Error closing RabbitMQ connection:", error);
    }
  }
}

export const rabbitMQ = new RabbitMQService();
