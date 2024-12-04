import { Message } from "./database/schema";

export type EventTypes =
  | "message:send"
  | "message:received"
  | "room:join"
  | "room:leave";

export interface BaseEvent {
  type: EventTypes;
  data: any;
}

export interface MessageSendEvent extends BaseEvent {
  type: "message:send";
  data: Message;
}

export type ClientToServerEvents = MessageSendEvent;

export interface MessageReceivedEvent extends BaseEvent {
  type: "message:received";
  data: Message;
}

export type ServerToClientEvents = MessageReceivedEvent;
