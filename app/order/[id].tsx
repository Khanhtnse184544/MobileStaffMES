import { Feather, Ionicons } from "@expo/vector-icons";
import * as signalR from "@microsoft/signalr";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

type Stage = {
  task_id: number;
  process_id: number;
  seq_num: number;

  process_name: string;
  process_code: string;
  machine: string;

  task_name: string;
  status: string;

  start_time: string | null;
  end_time: string | null;
  planned_start_time: string | null;
  planned_end_time: string | null;

  qty_good: number;
  qty_bad: number;

  input_materials: {
    name: string;
    code: string;
    quantity: number;
    unit: string;
  }[];

  output_product: {
    name: string;
    code: string;
    quantity: number;
    unit: string;
  };
};

type ProductionDetail = {
  production_status: string;
  order_code: string;
  delivery_date: string;
  product_name: string;
  ready_print_file: string;
  quantity: number;
  stages: Stage[];
};

export default function OrderDetail() {
  const [previewVisible, setPreviewVisible] = useState(false);
  const { id } = useLocalSearchParams();
  const [successVisible, setSuccessVisible] = useState(false);

  const [detail, setDetail] = useState<ProductionDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const [manualToken, setManualToken] = useState("");
  const [finishLoading, setFinishLoading] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  const [quantity, setQuantity] = useState("");
  const [qrData, setQrData] = useState<any>(null);

  const [roleId, setRoleId] = useState<number | null>(null);

  const onFinishedRef = useRef<() => void>(() => {});
  onFinishedRef.current = () => {
    setQrVisible(false);
    setModalVisible(false);
    setSuccessVisible(true);
  };

  // ✅ FIX 1: stage là stages[0], dùng stage để truy cập output_product
  const stage = detail?.stages?.[0];
  const isStageFinished = stage?.status === "Finished";
  const isStageScheduled = stage?.status === "Scheduled";
  const isStageUnassigned = stage?.status === "Unassigned";
  const isStageReady = stage?.status === "Ready";

  //===================== Role Name ======================
  const getRoleName = (roleId?: number | null) => {
    switch (roleId) {
      case 7:
        return "Ralo";
      case 8:
        return "Cắt";
      case 9:
        return "In";
      case 10:
        return "Phủ";
      case 11:
        return "Cán";
      case 12:
        return "Bồi";
      case 13:
        return "Bế";
      case 14:
        return "Dứt";
      case 15:
        return "Dán";
      default:
        return "Không xác định";
    }
  };

  useEffect(() => {
    const loadRole = async () => {
      const storedId = await SecureStore.getItemAsync("role_id");
      if (storedId) setRoleId(parseInt(storedId));
    };
    loadRole();
  }, []);

  const [quantityError, setQuantityError] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /*================ HANDLE INPUT =====================================*/
  const handleQuantityChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");

    if (cleaned === "") {
      setQuantity("");
      setQuantityError("");
      return;
    }

    let value = Number(cleaned);

    if (value <= 0) {
      setQuantityError("Số lượng phải lớn hơn 0");
      return;
    }

    const max = (stage?.output_product.quantity ?? 0) * 2;

    if (value > max) {
      setQuantityError(`Không được nhập tầm bậy`);
      value = max;
    } else {
      setQuantityError("");
    }

    setQuantity(String(value));
  };

  /*================= FETCH DETAIL =================*/
  const fetchDetail = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("jwt");
      const res = await fetch(
        `https://amms-juaa.onrender.com/api/Productions/detail/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "*/*",
          },
        },
      );
      const data = await res.json();
      setDetail(data);
    } catch (err) {
      console.log("Fetch detail error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  /*========== Finish Manual =======================*/
  const finishTask = async () => {
    try {
      if (!manualToken) {
        alert("Vui lòng nhập token");
        return;
      }

      setFinishLoading(true);
      const token = await SecureStore.getItemAsync("jwt");

      const res = await fetch(
        "https://amms-juaa.onrender.com/api/Tasks/finish",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: manualToken }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Finish thất bại");

      setManualToken("");
      onFinishedRef.current();
      fetchDetail();
    } catch (err: any) {
      console.log("Finish error:", err);
      alert(err.message || "Có lỗi xảy ra");
    } finally {
      setFinishLoading(false);
    }
  };

  /*================== SET TASK READY =========================*/
  const setTaskReady = async () => {
    try {
      if (!stage) return;
      setReadyLoading(true);
      const token = await SecureStore.getItemAsync("jwt");

      const res = await fetch(
        "https://amms-juaa.onrender.com/api/Tasks/ready",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "*/*",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ task_id: stage.task_id }),
        },
      );

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        throw new Error(data?.message || "Không thể bắt đầu công đoạn");
      }

      // Refresh detail after success
      fetchDetail();
    } catch (err: any) {
      console.log("Set ready error:", err);
      setErrorMessage(err.message || "Có lỗi xảy ra");
      setErrorVisible(true);
    } finally {
      setReadyLoading(false);
    }
  };

  /*================== SignalR =========================*/
  useEffect(() => {
    let connection: signalR.HubConnection;

    const startSignalR = async () => {
      const token = await SecureStore.getItemAsync("jwt");

      connection = new signalR.HubConnectionBuilder()
        .withUrl("https://amms-juaa.onrender.com/hubs/realtime", {
          accessTokenFactory: () => token || "",
        })
        .withAutomaticReconnect()
        .build();

      connection.on("ProdUpdated", (data) => {
        console.log("ProdUpdated:", data);

        setDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            stages: prev.stages.map((s) =>
              s.task_id === data.taskId ? { ...s, status: data.status } : s,
            ),
          };
        });

        if (data.status === "Finished") {
          setQrVisible(false);
          setModalVisible(false);
          setSuccessVisible(true);
        }
      });

      connection.on("OrderUpdated", (data) => {
        console.log("Realtime OrderUpdated:", data);
        fetchDetail();
      });

      await connection.start();
      await connection.invoke("JoinProd", Number(id));
    };

    startSignalR();

    return () => {
      connection?.stop();
    };
  }, [id]);

  useEffect(() => {
    if (stage?.status === "Finished") {
      setQrVisible(false);
      setModalVisible(false);
    }
  }, [stage?.status]);

  /*================= CREATE QR =================*/
  const createQr = async (): Promise<boolean> => {
    try {
      if (!stage) return false;

      if (stage.status === "Finished") {
        onFinishedRef.current();
        return false;
      }

      const defaultQty = stage?.output_product?.quantity ?? 0;

      // nếu không nhập → dùng default
      const qty = quantity ? Number(quantity) : defaultQty;

      if (isNaN(qty)) {
        setErrorMessage("Số lượng không hợp lệ");
        setErrorVisible(true);
        return false;
      }

      if (qty <= 0) {
        setErrorMessage("Số lượng phải lớn hơn 0");
        setErrorVisible(true);
        return false;
      }

      if (quantityError) {
        setErrorMessage(quantityError);
        setErrorVisible(true);
        return false;
      }

      const token = await SecureStore.getItemAsync("jwt");

      const body = {
        task_id: stage.task_id,
        ttl_minutes: 10,
        qty_good: qty,
      };

      const res = await fetch("https://amms-juaa.onrender.com/api/Tasks/qr", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/plain",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Không parse được dữ liệu từ server");
      }

      if (!res.ok) {
        throw new Error(data?.message || "Tạo QR thất bại");
      }

      if (stage.status === "Finished") {
        onFinishedRef.current();
        return false;
      }

      setQrData(data);
      setQrVisible(true);
      return true;
    } catch (err: any) {
      console.log("Create QR error:", err);
      setErrorMessage(err.message || "Có lỗi xảy ra khi tạo QR");
      setErrorVisible(true);
      return false;
    }
  };

  /*================= UTIL =================*/
  const formatDate = (date?: string | null) => {
    if (!date) return "--";
    return new Date(date).toLocaleString("vi-VN");
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "InProcessing":
        return "Đang sản xuất";
      case "Scheduled":
        return "Chờ sản xuất";
      case "Unassigned":
        return "Chờ bắt đầu sản xuất";
      case "Ready":
        return "Sẵn sàng";
      case "Completed":
      case "Finished":
        return "Hoàn thành";
      default:
        return status;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "InProcessing":
        return "#f59e0b";
      case "Scheduled":
        return "#6b7280";
      case "Unassigned":
        return "#9ca3af";
      case "Ready":
        return "#3b82f6";
      case "Completed":
      case "Finished":
        return "#16a34a";
      default:
        return "#6b7280";
    }
  };

  /*================= LOADING =================*/
  if (loading || !detail) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#2563eb"
          style={{ marginTop: 40 }}
        />
        <Text style={{ textAlign: "center", marginTop: 12, color: "#6b7280" }}>
          Đang tải dữ liệu...
        </Text>
      </SafeAreaView>
    );
  }

  /*================= UI =================*/
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Image source={require("../../assets/logo.png")} style={styles.logo} />
        <Text style={styles.company}>
          Công Ty TNHH Thương Mại Và Dịch Vụ{"\n"}In & Bao Bì Đại Phúc Hải
        </Text>
      </View>

      {/* ✅ FIX 5: Bọc content trong ScrollView để không bị cắt trên màn nhỏ */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* BACK */}
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Chi tiết đơn hàng</Text>
        </View>

        {/* ORDER CODE + STATUS BADGE */}
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>#{detail.order_code}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  getStatusColor(detail.production_status) + "20",
                borderColor: getStatusColor(detail.production_status),
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(detail.production_status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(detail.production_status) },
              ]}
            >
              {getStatusText(detail.production_status)}
            </Text>
          </View>
        </View>

        {/* PROCESS + TARGET */}
        <View style={styles.metaBox}>
          <View style={styles.metaItem}>
            <Ionicons name="settings-outline" size={18} color="#2563eb" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.metaLabel}>Công đoạn</Text>
              <Text style={styles.metaValue}>
                {stage?.process_name ?? "--"}
              </Text>
            </View>
          </View>

          <View style={styles.metaDivider} />

          {/* ✅ FIX 1+2: Sửa detail.stages.output_product → stage?.output_product */}
          <View style={styles.metaItem}>
            <Ionicons name="cube-outline" size={18} color="#2563eb" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.metaLabel}>Sản lượng mục tiêu</Text>
              <Text style={styles.metaValue}>
                {stage?.output_product?.quantity}{" "}
                {stage?.output_product?.name ?? "--"}
              </Text>
            </View>
          </View>
        </View>
        {/* READY PRINT FILE */}
        {detail.ready_print_file && (
          <View style={styles.fileBox}>
            <Text style={styles.fileLabel}>File in ấn</Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPreviewVisible(true)}
            >
              <Image
                source={{ uri: detail.ready_print_file }}
                style={styles.fileImage}
              />
            </TouchableOpacity>

            <Text style={styles.fileHint}>Nhấn vào để xem chi tiết</Text>
          </View>
        )}
        {/* INFO BOX */}
        <View style={styles.infoBox}>
          <InfoRow
            icon={<Feather name="download" size={18} color="#4b5563" />}
            label="Nguyên liệu"
            value={
              stage?.input_materials?.[0]
                ? `${stage.input_materials[0].name} × ${stage.input_materials[0].quantity} ${stage.input_materials[0].unit}`
                : "--"
            }
          />

          <InfoRow
            icon={<Feather name="calendar" size={18} color="#4b5563" />}
            label="Hạn hoàn thành"
            value={formatDate(stage?.planned_end_time)}
          />

          <InfoRow
            icon={
              <Ionicons name="play-circle-outline" size={20} color="#4b5563" />
            }
            label="Bắt đầu sản xuất"
            value={
              stage?.start_time ? formatDate(stage.start_time) : "Chưa bắt đầu"
            }
          />

          <InfoRow
            icon={
              <Ionicons name="stop-circle-outline" size={20} color="#4b5563" />
            }
            label="Hoàn thành sản xuất"
            value={
              isStageFinished && stage?.end_time
                ? formatDate(stage.end_time)
                : "Chưa hoàn thành"
            }
            valueStyle={
              isStageFinished
                ? { color: "#16a34a", fontWeight: "600" }
                : { color: "#9ca3af" }
            }
            noBorder
          />
        </View>
        {/* BUTTON */}
        {isStageFinished ? (
          <View style={styles.buttonFinished}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.buttonFinishedText}>
              Đã hoàn thành công đoạn
            </Text>
          </View>
        ) : isStageUnassigned || isStageScheduled ? (
          <TouchableOpacity
            style={styles.readyButton}
            onPress={setTaskReady}
            activeOpacity={0.85}
            disabled={readyLoading}
          >
            {readyLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="play-circle" size={22} color="#fff" />
            )}
            <Text style={styles.buttonText}>
              {readyLoading ? "Đang xử lý..." : "Bắt đầu sản xuất"}
            </Text>
          </TouchableOpacity>
        ) : isStageReady ? (
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setQuantity(String(stage?.output_product?.quantity ?? ""));
              setQuantityError("");
              setModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="qr-code-outline" size={22} color="#fff" />
            <Text style={styles.buttonText}>Báo cáo hoàn thành</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* INPUT MODAL */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nhập số lượng thành phẩm</Text>

            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder={`Mặc định: ${stage?.output_product?.quantity ?? "--"} sp`}
              placeholderTextColor="#9ca3af"
              value={quantity}
              onChangeText={handleQuantityChange}
            />

            {quantityError ? (
              <Text style={styles.fieldError}>{quantityError}</Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Huỷ</Text>
              </TouchableOpacity>

              {/* ✅ FIX 3: Xử lý đúng thứ tự — đóng modal SAU KHI createQr thành công */}
              <TouchableOpacity
                style={[styles.okBtn, !!quantityError && styles.okBtnDisabled]}
                disabled={!!quantityError}
                onPress={async () => {
                  const success = await createQr();
                  if (success) setModalVisible(false);
                }}
              >
                <Text style={styles.okText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR MODAL */}
      <Modal transparent visible={qrVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrBox}>
            <Text style={styles.modalTitle}>
              QR Code {roleId ? `— ${getRoleName(roleId)}` : ""}
            </Text>

            {qrData && (
              <>
                <View style={styles.qrWrapper}>
                  <QRCode value={qrData.token} size={200} />
                </View>
                <Text style={styles.qrQty}>
                  Số lượng: {qrData.qty_good_used} {stage?.output_product.unit}
                </Text>
                <View style={styles.tokenBox}>
                  <Text style={styles.tokenLabel}>Mã xác nhận</Text>
                  <Text style={styles.tokenValue}>{qrData.token}</Text>
                </View>
              </>
            )}

            <Text style={styles.manualLabel}>Hoặc nhập token thủ công:</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập token nếu scan lỗi..."
              placeholderTextColor="#9ca3af"
              value={manualToken}
              onChangeText={setManualToken}
            />

            <TouchableOpacity
              style={[styles.okBtn, { width: "100%", marginTop: 4 }]}
              onPress={finishTask}
              disabled={finishLoading}
            >
              <Text style={[styles.okText, { textAlign: "center" }]}>
                {finishLoading ? "Đang xử lý..." : "Xác nhận hoàn thành"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 10, alignSelf: "center" }]}
              onPress={() => setQrVisible(false)}
            >
              <Text style={styles.cancelText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal transparent visible={successVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color="#16a34a"
              style={{ alignSelf: "center", marginBottom: 12 }}
            />
            <Text style={[styles.modalTitle, { textAlign: "center" }]}>
              Thành công!
            </Text>
            <Text
              style={{
                textAlign: "center",
                marginBottom: 24,
                color: "#4b5563",
              }}
            >
              Công đoạn đã được hoàn thành.
            </Text>
            <TouchableOpacity
              style={styles.okBtn}
              onPress={() => setSuccessVisible(false)}
            >
              <Text style={[styles.okText, { textAlign: "center" }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ERROR MODAL */}
      <Modal transparent visible={errorVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons
              name="alert-circle"
              size={64}
              color="#ef4444"
              style={{ alignSelf: "center", marginBottom: 12 }}
            />
            <Text style={[styles.modalTitle, { textAlign: "center" }]}>
              Lỗi
            </Text>
            <Text
              style={{
                textAlign: "center",
                marginBottom: 24,
                color: "#4b5563",
              }}
            >
              {errorMessage}
            </Text>
            <TouchableOpacity
              style={styles.okBtn}
              onPress={() => setErrorVisible(false)}
            >
              <Text style={[styles.okText, { textAlign: "center" }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={previewVisible} transparent>
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={{ position: "absolute", top: 50, right: 20, zIndex: 10 }}
            onPress={() => setPreviewVisible(false)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          <Image
            source={{ uri: detail?.ready_print_file }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* Reusable InfoRow */
function InfoRow({
  icon,
  label,
  value,
  valueStyle,
  noBorder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueStyle?: object;
  noBorder?: boolean;
}) {
  return (
    <View style={[infoRowStyles.row, noBorder && { borderBottomWidth: 0 }]}>
      <View style={infoRowStyles.icon}>{icon}</View>
      <View style={infoRowStyles.content}>
        <Text style={infoRowStyles.label}>{label}</Text>
        <Text style={[infoRowStyles.value, valueStyle]}>{value}</Text>
      </View>
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  icon: { width: 32, alignItems: "center" },
  content: { flex: 1, marginLeft: 8 },
  label: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: { fontSize: 14, color: "#111827", fontWeight: "500" },
});

/*================= STYLE =================*/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  logo: { width: 56, height: 38, resizeMode: "contain", marginRight: 10 },
  company: { flex: 1, fontSize: 12, color: "#374151", lineHeight: 18 },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  pageTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },

  orderHeader: { alignItems: "center", paddingVertical: 12 },
  orderId: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 13, fontWeight: "600" },

  infoBox: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  metaBox: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  metaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  metaDivider: { width: 1, backgroundColor: "#e5e7eb", marginVertical: 10 },
  metaLabel: {
    fontSize: 11,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metaValue: { fontSize: 14, fontWeight: "700", color: "#111827" },

  /* ✅ FIX 5: Button màu xanh dương thay vì xanh neon #00ff00 */
  button: {
    flexDirection: "row",
    backgroundColor: "#2563eb",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563eb",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    marginLeft: 10,
    fontWeight: "700",
    color: "#fff",
    fontSize: 16,
  },

  readyButton: {
    flexDirection: "row",
    backgroundColor: "#f59e0b",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#f59e0b",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },

  buttonFinished: {
    flexDirection: "row",
    backgroundColor: "#16a34a",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonFinishedText: {
    marginLeft: 10,
    fontWeight: "700",
    color: "#fff",
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  modalSub: { fontSize: 12, color: "#6b7280", marginBottom: 16 },

  qrBox: {
    width: "88%",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  qrWrapper: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginVertical: 12,
  },
  qrQty: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  tokenBox: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 10,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  tokenLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 4 },
  tokenValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
    letterSpacing: 1,
  },
  manualLabel: {
    fontSize: 12,
    color: "#6b7280",
    alignSelf: "flex-start",
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#f9fafb",
    width: "100%",
  },
  fieldError: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 10,
  },

  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  cancelText: { color: "#374151", fontWeight: "600" },
  okBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  okBtnDisabled: { backgroundColor: "#93c5fd" },
  okText: { color: "#fff", fontWeight: "700" },
  fileBox: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },

  fileLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  fileImage: {
    width: width - 80,
    height: 180,
    borderRadius: 10,
    resizeMode: "cover",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  fileHint: {
    marginTop: 8,
    fontSize: 11,
    color: "#6b7280",
  },

  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  previewImage: {
    width: "100%",
    height: "80%",
  },
});
