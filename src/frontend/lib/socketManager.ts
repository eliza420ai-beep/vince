import { io, Socket } from "socket.io-client";

// Socket message types (must match server's SOCKET_MESSAGE_TYPE enum)
const SOCKET_MESSAGE_TYPE = {
  ROOM_JOINING: 1,
  SEND_MESSAGE: 2,
  MESSAGE: 3,
  ACK: 4,
  THINKING: 5,
  CONTROL: 6,
} as const;

class SocketManager {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private activeChannels: Set<string> = new Set();

  connect(userId: string, userName?: string) {
    // Server requires a valid UUID entityId in auth; don't connect until we have it
    const validUserId = userId?.trim();
    if (!validUserId) {
      console.warn(
        "Socket connect skipped: userId is required for server auth (entityId)",
      );
      return this.socket ?? null;
    }

    if (this.socket?.connected) {
      console.log("Socket already connected");
      if (userName) this.userName = userName;
      return this.socket;
    }

    this.userId = validUserId;
    this.userName = userName || null;

    const token = localStorage.getItem("auth-token");
    if (!token) {
      console.warn("No auth token found for socket connection");
    }

    this.socket = io(window.location.origin + "/", {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: {
        token,
        entityId: validUserId, // Required by server; used for channel access checks
      },
    });

    this.socket.on("connect", () => {
      console.log(" Connected to Eliza server");
    });

    this.socket.on("disconnect", (reason) => {
      console.log(" Disconnected from Eliza server:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    return this.socket;
  }

  /**
   * Update the stored username (useful when user profile loads after socket connects)
   */
  setUserName(userName: string) {
    this.userName = userName;
  }

  joinChannel(
    channelId: string,
    serverId: string,
    metadata?: Record<string, any>,
  ) {
    if (!this.socket) {
      throw new Error("Socket not connected. Call connect() first.");
    }

    this.activeChannels.add(channelId);

    this.socket.emit("message", {
      type: SOCKET_MESSAGE_TYPE.ROOM_JOINING,
      payload: {
        channelId,
        entityId: this.userId,
        message_server_id: serverId,
        metadata,
      },
    });
  }

  leaveChannel(channelId: string) {
    this.activeChannels.delete(channelId);
    console.log(`Left channel: ${channelId}`);
  }

  sendMessage(
    channelId: string,
    message: string,
    serverId: string,
    metadata?: Record<string, any>,
  ) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }
    if (!this.userId) {
      throw new Error(
        "Socket sendMessage: userId (entityId) is required for author_id",
      );
    }
    // Server requires: channelId, messageServerId (or message_server_id), senderId (or author_id), message
    const senderName = this.userName || `User-${this.userId.substring(0, 8)}`;
    const payload = {
      channelId,
      messageServerId: serverId,
      message_server_id: serverId,
      senderId: this.userId,
      author_id: this.userId,
      message,
      senderName,
      source: "custom_ui",
      metadata,
    };
    console.log(" [SocketManager] Emitting SEND_MESSAGE:", payload);
    this.socket.emit("message", {
      type: SOCKET_MESSAGE_TYPE.SEND_MESSAGE,
      payload,
    });
  }

  onMessage(callback: (data: any) => void) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }
    this.socket.on("messageBroadcast", callback);
    return () => this.socket?.off("messageBroadcast", callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.activeChannels.clear();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketManager = new SocketManager();
