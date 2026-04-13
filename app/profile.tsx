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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

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
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.push("/home")}
        >
          <Ionicons name="calendar-outline" size={36} color="#000" />
          <Text style={styles.tabText}>Sản xuất</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab}>
          <Ionicons name="person-outline" size={36} color="#2563eb" />
          <Text style={[styles.tabText, { color: "#2563eb" }]}>Hồ sơ</Text>
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

  tabText: {
    fontSize: 14,
    marginTop: 4,
  },
});
