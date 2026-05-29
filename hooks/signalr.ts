import * as signalR from "@microsoft/signalr";
import { SIGNALR_HUB_URL } from "../constants/api";

let connection: signalR.HubConnection | null = null;

/* Mapping từ role name (FE) sang machine code (BE group name) */
export const ROLE_TO_MACHINE: Record<string, string> = {
  "Cắt": "CAT",
  "In": "IN",
  "Phủ": "PHU",
  "Cán": "CAN",
  "Ralo": "RALO",
  "Bồi": "BOI",
  "Dán": "DAN",
  "Bế": "BE",
  "Dứt": "DUT",
};

export const getConnection = () => {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL)
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

/**
 * Join machine group(s) dựa trên role của user.
 * Nếu là phong_ban thì join nhiều group cùng lúc.
 */
export const joinMachineGroups = async (roleName: string) => {
  const conn = getConnection();
  if (conn.state !== signalR.HubConnectionState.Connected) return;

  const machineCodes: string[] = [];

  // Phong ban → join nhiều group
  if (roleName === "phong_ban_1") {
    machineCodes.push("RALO", "CAT", "IN");
  } else if (roleName === "phong_ban_2") {
    machineCodes.push("PHU", "CAN", "BOI");
  } else if (roleName === "phong_ban_3") {
    machineCodes.push("BE", "DUT", "DAN");
  } else {
    const code = ROLE_TO_MACHINE[roleName];
    if (code) machineCodes.push(code);
  }

  for (const code of machineCodes) {
    try {
      await conn.invoke("JoinByRole", code);
      console.log(`Joined machine group: ${code}`);
    } catch (err) {
      console.log(`Failed to join group ${code}:`, err);
    }
  }
};

export default getConnection();
