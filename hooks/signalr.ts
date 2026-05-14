import * as signalR from "@microsoft/signalr";

let connection: signalR.HubConnection | null = null;

export const getConnection = () => {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl("https://mmes-sep490-84gr.onrender.com/hubs/realtime")
      //.withUrl("http://10.0.2.2:5233/hubs/realtime")
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();
  }

  return connection;
};

export const startSignalR = async () => {
  const conn = getConnection();

  if (conn.state === signalR.HubConnectionState.Disconnected) {
    try {
      await conn.start();
      console.log("SignalR Connected");

      await conn.invoke("JoinRequestsAll");
    } catch (err) {
      console.log("SignalR start error:", err);
    }
  }
};

export default getConnection();
