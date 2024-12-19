import amqp from "amqplib";

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

      // Declare exchange
      await this.channel.assertExchange(EXCHANGE, "direct", { durable: false });

      // Declare queues
      await this.channel.assertQueue(SEND_QUEUE, { durable: false });
      await this.channel.assertQueue(RECEIVE_QUEUE, { durable: false });

      // Bind queues to exchange
      await this.channel.bindQueue(SEND_QUEUE, EXCHANGE, "send");
      await this.channel.bindQueue(RECEIVE_QUEUE, EXCHANGE, "receive");

      console.log("🐰 Connected to RabbitMQ");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
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

      await this.channel.publish(
        EXCHANGE,
        "send",
        Buffer.from(JSON.stringify(message))
      );
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

  async close() {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (error) {
      console.error("Error closing RabbitMQ connection:", error);
    }
  }
}

export const rabbitMQ = new RabbitMQService();
