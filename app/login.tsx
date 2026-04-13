import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const scale = width / 375;

function normalize(size: number) {
  return Math.round(scale * size);
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  //=====login=====
  const handleLogin = async () => {
    try {
      const response = await fetch("https://amms-juaa.onrender.com/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "*/*",
        },
        body: JSON.stringify({
          user_name: username,
          email: "string",
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Login success:", data);

        // Lưu token
        await SecureStore.setItemAsync("token", data.jwt);

        // Lưu user info
        await SecureStore.setItemAsync("jwt", data.jwt);
        await SecureStore.setItemAsync("role_id", String(data.role_id));
        await SecureStore.setItemAsync("full_name", data.full_name);

        // Chuyển trang
        router.replace("/home");
      } else {
        alert("Sai tài khoản hoặc mật khẩu");
      }
    } catch (error) {
      console.error(error);
      alert("Không thể kết nối server");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
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

          {/* FORM */}
          <View style={styles.card}>
            <Text style={styles.title}>Đăng nhập</Text>

            <Text style={styles.subtitle}>Chào mừng trở lại Đại Phúc Hải</Text>

            <TextInput
              placeholder="Tên đăng nhập"
              style={styles.input}
              value={username}
              onChangeText={setUsername}
            />

            <TextInput
              placeholder="Mật khẩu"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity>
              <Text style={styles.forgot}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: height * 0.05,
  },

  header: {
    alignItems: "center",
    marginBottom: height * 0.05,
    paddingHorizontal: 20,
  },

  logo: {
    width: width * 0.3,
    height: width * 0.15,
    marginBottom: 10,
  },

  company: {
    textAlign: "center",
    fontSize: normalize(14),
    fontWeight: "500",
  },

  card: {
    width: "90%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    elevation: 3,
  },

  title: {
    textAlign: "center",
    fontSize: normalize(22),
    fontWeight: "bold",
  },

  subtitle: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 5,
    marginBottom: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: normalize(14),
  },

  forgot: {
    textAlign: "right",
    color: "#6b7280",
    marginBottom: 20,
  },

  button: {
    backgroundColor: "#5b50ff",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: normalize(16),
  },
});
