import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function Profile() {
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const getRoleName = (roleId: string) => {
    switch (roleId) {
      case "7":
        return "Ralo";
      case "8":
        return "Cắt";
      case "9":
        return "In";
      case "10":
        return "Phủ";
      case "11":
        return "Cán";
      case "12":
        return "Bồi";
      case "13":
        return "Bế";
      case "14":
        return "Dứt";
      case "15":
        return "Dán";
      case "19":
        return "phong_ban_1";
      case "20":
        return "phong_ban_2";
      case "21":
        return "phong_ban_3";
      default:
        return "";
    }
  };

  useEffect(() => {
    const loadRole = async () => {
      const roleId = await SecureStore.getItemAsync("role_id");
      if (roleId) setRole(getRoleName(roleId));
    };
    loadRole();
  }, []);

  const ROLE_THEMES: Record<string, RoleTheme> = {
    Ralo: {
      primary: "#534AB7",
      light: "#EEEDFE",
      badge: "#CECBF6",
      badgeText: "#3C3489",
      header: "#EEEDFE",
      headerText: "#534AB7",
      bottomBar: "#534AB7",
    },
    Cắt: {
      primary: "#993C1D",
      light: "#FAECE7",
      badge: "#F5C4B3",
      badgeText: "#712B13",
      header: "#FAECE7",
      headerText: "#993C1D",
      bottomBar: "#993C1D",
    },
    In: {
      primary: "#185FA5",
      light: "#E6F1FB",
      badge: "#B5D4F4",
      badgeText: "#0C447C",
      header: "#E6F1FB",
      headerText: "#185FA5",
      bottomBar: "#185FA5",
    },
    Phủ: {
      primary: "#3B6D11",
      light: "#EAF3DE",
      badge: "#C0DD97",
      badgeText: "#27500A",
      header: "#EAF3DE",
      headerText: "#3B6D11",
      bottomBar: "#3B6D11",
    },
    Cán: {
      primary: "#854F0B",
      light: "#FAEEDA",
      badge: "#FAC775",
      badgeText: "#633806",
      header: "#FAEEDA",
      headerText: "#854F0B",
      bottomBar: "#854F0B",
    },
    Bồi: {
      primary: "#0F6E56",
      light: "#E1F5EE",
      badge: "#9FE1CB",
      badgeText: "#085041",
      header: "#E1F5EE",
      headerText: "#0F6E56",
      bottomBar: "#0F6E56",
    },
    Bế: {
      primary: "#993556",
      light: "#FBEAF0",
      badge: "#F4C0D1",
      badgeText: "#72243E",
      header: "#FBEAF0",
      headerText: "#993556",
      bottomBar: "#993556",
    },
    Dứt: {
      primary: "#A32D2D",
      light: "#FCEBEB",
      badge: "#F7C1C1",
      badgeText: "#791F1F",
      header: "#FCEBEB",
      headerText: "#A32D2D",
      bottomBar: "#A32D2D",
    },
    Dán: {
      primary: "#085041",
      light: "#E1F5EE",
      badge: "#5DCAA5",
      badgeText: "#04342C",
      header: "#E1F5EE",
      headerText: "#085041",
      bottomBar: "#085041",
    },
    phong_ban_1: {
      primary: "#534AB7",
      light: "#EEEDFE",
      badge: "#CECBF6",
      badgeText: "#3C3489",
      header: "#EEEDFE",
      headerText: "#534AB7",
      bottomBar: "#534AB7",
    },
    phong_ban_2: {
      primary: "#3B6D11",
      light: "#EAF3DE",
      badge: "#C0DD97",
      badgeText: "#27500A",
      header: "#EAF3DE",
      headerText: "#3B6D11",
      bottomBar: "#3B6D11",
    },
    phong_ban_3: {
      primary: "#993556",
      light: "#FBEAF0",
      badge: "#F4C0D1",
      badgeText: "#72243E",
      header: "#FBEAF0",
      headerText: "#993556",
      bottomBar: "#993556",
    },
  };

  type RoleTheme = {
    primary: string; // main accent (buttons, borders, icons)
    light: string; // light background tint
    badge: string; // badge background
    badgeText: string; // badge text
    header: string; // header background
    headerText: string; // header text/icon
    bottomBar: string; // bottom tab bar
  };

  const DEFAULT_THEME: RoleTheme = {
    primary: "#2563eb",
    light: "#eff6ff",
    badge: "#bfdbfe",
    badgeText: "#1e40af",
    header: "#fff",
    headerText: "#2563eb",
    bottomBar: "#eab308",
  };

  const getRoleTheme = (roleName: string): RoleTheme =>
    ROLE_THEMES[roleName] ?? DEFAULT_THEME;

  const theme = getRoleTheme(role);

  const loadUser = async () => {
    const storedName = await SecureStore.getItemAsync("full_name");
    const storedEmail = await SecureStore.getItemAsync("email");

    if (storedName) setName(storedName);
    if (storedEmail) setEmail(storedEmail);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("jwt");
    await SecureStore.deleteItemAsync("role_id");
    await SecureStore.deleteItemAsync("full_name");

    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.company}>
          Công Ty TNHH Thương Mại Và Dịch Vụ In & Bao Bì Đại Phúc Hải
        </Text>
      </View>

      {/* AVATAR */}
      <View style={styles.avatarBox}>
        <Ionicons name="person-circle-outline" size={110} color="#bdbdbd" />
      </View>

      {/* USER INFO */}
      <View style={styles.infoContainer}>
        <View style={styles.row}>
          <Feather name="user" size={24} color="#000" />
          <Text style={styles.text}>{name || "Nguyen Van A"}</Text>
        </View>

        <View style={styles.row}>
          <MaterialIcons name="email" size={24} color="#000" />
          <Text style={styles.text}>{email || "example@gmail.com"}</Text>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <MaterialIcons name="logout" size={26} color="#ff6a00" />
          <Text style={styles.logout}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM TAB */}
      <View style={[styles.bottomBar, { backgroundColor: theme.bottomBar }]}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.replace("/home")}
        >
          <Ionicons name="calendar-outline" size={32} color="#ffffffcc" />
          <Text style={{ color: "#ffffffcc" }}>Sản xuất</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.push("/dashboard")}
        >
          <Ionicons name="grid" size={32} color="#ffffffcc" />
          <Text style={{ color: "#ffffffcc" }}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.push("/profile")}
        >
          <Ionicons name="person-outline" size={32} color="#fff" />
          <Text style={styles.activeTab}>Hồ sơ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    paddingBottom: 10,
  },

  logo: {
    width: width * 0.35,
    height: 60,
  },

  company: {
    textAlign: "center",
    fontSize: 16,
    paddingHorizontal: 20,
  },

  avatarBox: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },

  infoContainer: {
    paddingHorizontal: 40,
    gap: 30,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },

  text: {
    fontSize: 16,
  },

  logout: {
    fontSize: 16,
    color: "#ff6a00",
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#eab308",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
  },

  tab: {
    alignItems: "center",
  },
  activeTab: { color: "#fff", fontWeight: "600" },

  tabText: {
    fontSize: 14,
    marginTop: 4,
  },
});
