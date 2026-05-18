import { Feather, Ionicons } from "@expo/vector-icons";
import * as signalR from "@microsoft/signalr";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
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

type ConsumableMaterial = {
  material_id: number;
  material_code: string;
  material_name: string;
  unit: string;
  estimated_input_qty: number;
  is_mapped: boolean;
};

type QrPrepare = {
  task_id: number;
  process_code: string;
  process_name: string;
  qty_unit: string;
  min_allowed: number;
  max_allowed: number;
  suggested_qty: number;
  consumable_materials: ConsumableMaterial[];
  reference_inputs: any[];
  is_group_production?: boolean;
  allow_manual_input?: boolean;
  can_use_manual_input?: boolean;
  manual_input_optional?: boolean;
  production_output_unit?: string;
};

/*================= PROCESS TIMELINE COMPONENT =================*/
function ProcessTimeline({ stages }: { stages: Stage[] }) {
  const [expanded, setExpanded] = useState(false);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Finished":
        return {
          bg: "#16a34a",
          text: "#fff",
          label: "Hoàn thành",
          icon: "checkmark" as const,
        };
      case "InProcessing":
        return {
          bg: "#f59e0b",
          text: "#fff",
          label: "Đang sản xuất",
          icon: "time" as const,
        };
      case "Ready":
        return {
          bg: "#3b82f6",
          text: "#fff",
          label: "Sẵn sàng",
          icon: "play" as const,
        };
      case "Scheduled":
        return {
          bg: "#6b7280",
          text: "#fff",
          label: "Chờ sản xuất",
          icon: "ellipsis-horizontal" as const,
        };
      case "Unassigned":
      default:
        return {
          bg: "#e5e7eb",
          text: "#9ca3af",
          label: "Chờ bắt đầu",
          icon: "remove" as const,
        };
    }
  };

  const currentIndex = stages.findIndex((s) => s.status !== "Finished");

  const formatShortDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const finishedCount = stages.filter((s) => s.status === "Finished").length;
  const progressPercent = Math.round((finishedCount / stages.length) * 100);

  return (
    <View style={tlStyles.container}>
      <TouchableOpacity
        style={tlStyles.headerRow}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1 }}>
          <Text style={tlStyles.title}>Tiến độ công đoạn</Text>
          <Text style={tlStyles.subtitle}>
            {currentIndex === -1
              ? `Đã hoàn thành tất cả ${stages.length} công đoạn`
              : `Đang ở công đoạn ${currentIndex + 1}/${stages.length}: ${stages[currentIndex]?.process_name}`}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#6b7280"
        />
      </TouchableOpacity>

      <View style={tlStyles.progressBarBg}>
        <View
          style={[
            tlStyles.progressBarFill,
            { width: `${progressPercent}%` as any },
          ]}
        />
      </View>
      <Text style={tlStyles.progressText}>
        {finishedCount}/{stages.length} công đoạn hoàn thành
      </Text>

      {expanded && (
        <View style={tlStyles.stageList}>
          {stages.map((stage, index) => {
            const cfg = getStatusConfig(stage.status);
            const isCurrent = index === currentIndex;
            const isLast = index === stages.length - 1;
            const startDate = formatShortDate(stage.start_time);
            const endDate = formatShortDate(stage.end_time);

            return (
              <View key={stage.task_id} style={tlStyles.stageRow}>
                <View style={tlStyles.dotCol}>
                  <View
                    style={[
                      tlStyles.dot,
                      { backgroundColor: cfg.bg },
                      isCurrent && tlStyles.dotCurrent,
                    ]}
                  >
                    {stage.status === "Finished" ? (
                      <Ionicons name="checkmark" size={13} color="#fff" />
                    ) : isCurrent ? (
                      <View style={tlStyles.dotInnerPulse} />
                    ) : (
                      <View style={tlStyles.dotInnerEmpty} />
                    )}
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        tlStyles.connector,
                        {
                          backgroundColor:
                            stage.status === "Finished" ? "#16a34a" : "#e5e7eb",
                        },
                      ]}
                    />
                  )}
                </View>

                <View
                  style={[
                    tlStyles.stageContent,
                    isLast && { paddingBottom: 0 },
                  ]}
                >
                  <View style={tlStyles.stageHeaderRow}>
                    <Text
                      style={[
                        tlStyles.stageName,
                        isCurrent && tlStyles.stageNameCurrent,
                      ]}
                    >
                      {stage.seq_num}. {stage.process_name}
                    </Text>
                    {isCurrent && (
                      <View style={tlStyles.currentBadge}>
                        <Text style={tlStyles.currentBadgeText}>HIỆN TẠI</Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      tlStyles.stageStatus,
                      { color: cfg.bg === "#e5e7eb" ? "#9ca3af" : cfg.bg },
                    ]}
                  >
                    {cfg.label}
                  </Text>

                  {startDate || stage.output_product?.quantity ? (
                    <Text style={tlStyles.stageMeta}>
                      {startDate
                        ? `${startDate}${endDate && endDate !== startDate ? " → " + endDate : ""} · `
                        : ""}
                      {stage.output_product?.quantity?.toLocaleString("vi-VN")}{" "}
                      {stage.output_product?.unit}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const tlStyles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: "#16a34a",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 16,
    textAlign: "right",
  },
  stageList: {},
  stageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dotCol: {
    alignItems: "center",
    width: 28,
    marginRight: 10,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  dotCurrent: {
    borderWidth: 2,
    borderColor: "#f59e0b",
  },
  dotInnerPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  dotInnerEmpty: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d1d5db",
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 24,
  },
  stageContent: {
    flex: 1,
    paddingBottom: 16,
  },
  stageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  stageName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  stageNameCurrent: {
    color: "#111827",
    fontWeight: "700",
  },
  currentBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#92400e",
    letterSpacing: 0.5,
  },
  stageStatus: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  stageMeta: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
});

export default function OrderDetail() {
  const stageImages: { [processName: string]: any } = {
    Ralo: require("../../assets/images/Ralo.png"),
    Bồi: require("../../assets/images/Boi.png"),
    Dán: require("../../assets/images/Dan.png"),
    Cắt: require("../../assets/images/Cat.jpg"),
    Phủ: require("../../assets/images/Phu.png"),
  };

  const [previewVisible, setPreviewVisible] = useState(false);
  const [localPreviewVisible, setLocalPreviewVisible] = useState(false);
  const { id, type } = useLocalSearchParams();
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

  // QR Prepare state
  const [qrPrepare, setQrPrepare] = useState<QrPrepare | null>(null);
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [materialLeftQtys, setMaterialLeftQtys] = useState<{ [id: number]: string }>({});
  const [materialUsedQtys, setMaterialUsedQtys] = useState<{ [id: number]: string }>({});
  const [refUsedQtys, setRefUsedQtys] = useState<{ [code: string]: string }>({});
  const [refLeftQtys, setRefLeftQtys] = useState<{ [code: string]: string }>({});
  const [qtyBad, setQtyBad] = useState("0");
  const [useManualInputToggle, setUseManualInputToggle] = useState(false);
  const [materialErrors, setMaterialErrors] = useState<{
    [id: number]: string;
  }>({});

  // Image capture state
  const [capturedImages, setCapturedImages] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string>("");

  // Reason state
  const [reason, setReason] = useState("");

  // Token copy state
  const [tokenCopied, setTokenCopied] = useState(false);

  const [roleId, setRoleId] = useState<number | null>(null);

  const onFinishedRef = useRef<() => void>(() => {});
  onFinishedRef.current = () => {
    setQrVisible(false);
    setModalVisible(false);
    setSuccessVisible(true);
  };

  const getProcessNameByRole = (roleId?: number | null) => {
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
        return null;
    }
  };

  const processName = getProcessNameByRole(roleId);
  const stage = processName
    ? detail?.stages?.find((s) => s.process_name === processName)
    : null;
  const isStageFinished = stage?.status === "Finished";
  const isStageScheduled = stage?.status === "Scheduled";
  const isStageUnassigned = stage?.status === "Unassigned";
  const isStageReady = stage?.status === "Ready";

  // Check if the previous stage is finished (or this is the first stage)
  const currentStageIndex =
    detail?.stages?.findIndex((s) => s.task_id === stage?.task_id) ?? -1;
  const isPrevStageFinished =
    currentStageIndex <= 0 ||
    detail?.stages?.[currentStageIndex - 1]?.status === "Finished";

  // ✅ Chỉ hiện file in ấn cho công đoạn In (9)
  const showPrintFile = roleId === 9;

  const mustManual = qrPrepare?.is_group_production === true || qrPrepare?.allow_manual_input === true;
  const isManual = mustManual || (qrPrepare?.can_use_manual_input === true && qrPrepare?.manual_input_optional === true && useManualInputToggle);

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

  /*================ HANDLE QUANTITY INPUT =====================================*/
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
    const max = qrPrepare?.max_allowed && qrPrepare.max_allowed > 0 ? qrPrepare.max_allowed : (stage?.output_product.quantity ?? 99999999);
    if (value > max) {
      setQuantityError(`Số lượng không được vượt quá ${max}`);
      value = max;
    } else {
      setQuantityError("");
    }
    setQuantity(String(value));
  };

  /*================ HANDLE MATERIAL INPUT =====================================*/
  const handleMaterialQtyChange = (
    materialId: number,
    estimatedQty: number,
    text: string,
  ) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    if (cleaned === "") {
      setMaterialLeftQtys((prev) => ({ ...prev, [materialId]: "" }));
      setMaterialErrors((prev) => ({ ...prev, [materialId]: "" }));
      return;
    }
    let value = Number(cleaned);
    if (isNaN(value) || value < 0) {
      setMaterialErrors((prev) => ({
        ...prev,
        [materialId]: "Số lượng không hợp lệ",
      }));
      setMaterialLeftQtys((prev) => ({ ...prev, [materialId]: cleaned }));
      return;
    }
    if (value > estimatedQty) {
      setMaterialErrors((prev) => ({
        ...prev,
        [materialId]: `Tối đa ${estimatedQty}`,
      }));
      value = estimatedQty;
    } else {
      setMaterialErrors((prev) => ({ ...prev, [materialId]: "" }));
    }
    setMaterialLeftQtys((prev) => ({ ...prev, [materialId]: String(value) }));
  };

  /*================= IMAGE CAPTURE =================*/
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Quyền truy cập",
        "Ứng dụng cần quyền truy cập camera để chụp ảnh báo cáo.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setCapturedImages((prev) => [...prev, ...result.assets]);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Quyền truy cập",
        "Ứng dụng cần quyền truy cập thư viện ảnh.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled && result.assets.length > 0) {
      setCapturedImages((prev) => [...prev, ...result.assets]);
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  };

  /*================= COPY TOKEN =================*/
  const copyToken = async (token: string) => {
    await Clipboard.setStringAsync(token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  /*================= FETCH DETAIL =================*/
  const fetchDetail = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("jwt");
      const url =
        type === "group"
          ? `https://mmes-sep490-84gr.onrender.com/api/GroupProductions/${id}/detail`
          : `https://mmes-sep490-84gr.onrender.com/api/Productions/detail/${id}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "*/*" },
      });
      const data = await res.json();

      if (type === "group") {
        const mappedStages =
          data.stages?.map((s: any) => ({
            ...s,
            input_materials:
              s.input_materials?.map((m: any) => ({
                name: m.name,
                code: m.code,
                quantity: m.estimated_qty,
                unit: m.unit,
              })) || [],
            output_product:
              s.outputs && s.outputs.length > 0
                ? {
                    name: s.outputs[0].name,
                    code: s.outputs[0].code,
                    quantity: s.outputs[0].estimated_qty,
                    unit: s.outputs[0].unit,
                  }
                : { name: "", code: "", quantity: 0, unit: "" },
            qty_good: s.actual_output_qty,
            qty_bad: 0,
          })) || [];

        setDetail({
          ...data,
          order_code: data.code,
          product_name: data.product_type_name,
          quantity: data.total_qty,
          production_status: data.status,
          stages: mappedStages,
        });
      } else {
        setDetail(data);
      }
    } catch (err) {
      console.log("Fetch detail error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  /*================= FETCH QR PREPARE =================*/
  const fetchQrPrepare = async (taskId: number) => {
    try {
      setPrepareLoading(true);
      const token = await SecureStore.getItemAsync("jwt");
      const res = await fetch(
        `https://mmes-sep490-84gr.onrender.com/api/Tasks/qr-prepare/${taskId}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "*/*" } },
      );
      const data: QrPrepare = await res.json();
      setQrPrepare(data);

      // Prefill material quantities with empty
      const initLeft: { [id: number]: string } = {};
      const initUsed: { [id: number]: string } = {};
      data.consumable_materials.forEach((m) => {
        initLeft[m.material_id] = "";
        initUsed[m.material_id] = "";
      });
      setMaterialLeftQtys(initLeft);
      setMaterialUsedQtys(initUsed);

      const initRefUsed: { [code: string]: string } = {};
      const initRefLeft: { [code: string]: string } = {};
      data.reference_inputs?.forEach((x) => {
        initRefUsed[x.input_code] = String(x.estimated_qty ?? 0);
        initRefLeft[x.input_code] = "0";
      });
      setRefUsedQtys(initRefUsed);
      setRefLeftQtys(initRefLeft);

      setQtyBad("0");
      setUseManualInputToggle(false);
      setMaterialErrors({});

      if (data.suggested_qty && data.suggested_qty > 0) {
        setQuantity(String(data.suggested_qty));
      }
    } catch (err) {
      console.log("Fetch qr-prepare error:", err);
    } finally {
      setPrepareLoading(false);
    }
  };

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
        "https://mmes-sep490-84gr.onrender.com/api/Tasks/finish",
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
        "https://mmes-sep490-84gr.onrender.com/api/Tasks/ready",
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
      if (!res.ok)
        throw new Error(data?.message || "Không thể bắt đầu công đoạn");
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
        .withUrl("https://mmes-sep490-84gr.onrender.com/hubs/realtime", {
          accessTokenFactory: () => token || "",
        })
        .withAutomaticReconnect()
        .build();

      connection.on("update-ui", (data) => {
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

      connection.on("update-ui", (data) => {
        console.log("Realtime Updated:", data);
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

      // Validate materials
      if (qrPrepare && qrPrepare.consumable_materials.length > 0) {
        for (const mat of qrPrepare.consumable_materials) {
          if (roleId === 7 && mat.material_name.toLowerCase().includes("kẽm")) {
            continue;
          }
          if (isManual) {
            const usedVal = materialUsedQtys[mat.material_id];
            const leftVal = materialLeftQtys[mat.material_id];
            if (usedVal && usedVal !== "") {
              if (Number(usedVal) < 0) {
                setMaterialErrors((prev) => ({
                  ...prev,
                  [mat.material_id]: "Số lượng đã dùng không hợp lệ",
                }));
                return false;
              }
            }
            if (leftVal && leftVal !== "") {
              if (Number(leftVal) < 0) {
                setMaterialErrors((prev) => ({
                  ...prev,
                  [mat.material_id]: "Số lượng dư không hợp lệ",
                }));
                return false;
              }
            }
          } else {
            // Estimate mode
            const val = materialLeftQtys[mat.material_id];
            if (val && val !== "") {
              if (Number(val) < 0) {
                setMaterialErrors((prev) => ({
                  ...prev,
                  [mat.material_id]: "Số lượng không hợp lệ",
                }));
                return false;
              }
              if (Number(val) > mat.estimated_input_qty) {
                setMaterialErrors((prev) => ({
                  ...prev,
                  [mat.material_id]: `Tối đa ${mat.estimated_input_qty}`,
                }));
                return false;
              }
            }
          }
          if (materialErrors[mat.material_id]) return false;
        }
      }

      // Validate reference inputs if in manual mode
      if (isManual && qrPrepare?.reference_inputs && qrPrepare.reference_inputs.length > 0) {
        for (const x of qrPrepare.reference_inputs) {
          const usedVal = refUsedQtys[x.input_code];
          const leftVal = refLeftQtys[x.input_code];
          if (usedVal && Number(usedVal) < 0) {
            setErrorMessage(`Số lượng BTP đã dùng của ${x.input_name} không hợp lệ`);
            setErrorVisible(true);
            return false;
          }
          if (leftVal && Number(leftVal) < 0) {
            setErrorMessage(`Số lượng BTP dư của ${x.input_name} không hợp lệ`);
            setErrorVisible(true);
            return false;
          }
        }
      }

      const defaultQty = qrPrepare?.suggested_qty ?? stage?.output_product?.quantity ?? 0;
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

      if (isManual) {
        if (Number(qtyBad || 0) < 0) {
          setErrorMessage("Sản lượng hỏng không được nhỏ hơn 0");
          setErrorVisible(true);
          return false;
        }
      }

      const token = await SecureStore.getItemAsync("jwt");

      // Build materials array
      const materials =
        qrPrepare?.consumable_materials
          .filter(
            (mat) =>
              !(
                roleId === 7 &&
                mat.material_name.toLowerCase().includes("kẽm")
              ),
          )
          .map((mat) => {
            if (isManual) {
              const usedStr = materialUsedQtys[mat.material_id];
              const leftStr = materialLeftQtys[mat.material_id];
              const qtyUsed = usedStr === "" || usedStr === undefined ? 0 : Number(usedStr);
              const qtyLeft = leftStr === "" || leftStr === undefined ? 0 : Number(leftStr);
              return {
                material_id: mat.material_id,
                quantity_used: qtyUsed,
                quantity_left: qtyLeft,
                is_stock: qtyLeft > 0,
              };
            } else {
              // SINGLE Estimate
              const leftStr = materialLeftQtys[mat.material_id];
              const qtyLeft = leftStr === "" || leftStr === undefined ? 0 : Number(leftStr);
              return {
                material_id: mat.material_id,
                quantity_used: 0,
                quantity_left: qtyLeft,
                is_stock: qtyLeft > 0,
              };
            }
          }) ?? [];

      // Build reference inputs array
      const referenceInputs =
        qrPrepare?.reference_inputs?.map((x) => {
          const usedStr = refUsedQtys[x.input_code];
          const leftStr = refLeftQtys[x.input_code];
          const qtyUsed = usedStr === "" || usedStr === undefined ? 0 : Number(usedStr);
          const qtyLeft = leftStr === "" || leftStr === undefined ? 0 : Number(leftStr);
          return {
            input_code: x.input_code,
            input_name: x.input_name,
            unit: x.unit,
            quantity_used: qtyUsed,
            quantity_left: qtyLeft,
          };
        }) ?? [];

      // Build outputs array
      const outputs = [{
        output_code: qrPrepare?.process_code ?? stage?.process_code ?? "",
        output_name: `BTP sau ${qrPrepare?.process_name ?? stage?.process_name ?? ""}`,
        unit: qrPrepare?.production_output_unit ?? qrPrepare?.qty_unit ?? stage?.output_product?.unit ?? "",
        quantity_good: qty,
        quantity_bad: Number(qtyBad || 0),
      }];

      // Build FormData for multipart/form-data
      const formData = new FormData();
      formData.append("task_id", String(stage.task_id));
      formData.append("ttl_minutes", "60");
      formData.append("qty_good", String(qty));
      formData.append("use_manual_input", isManual ? "true" : "false");

      // Append reason if provided
      formData.append("reason", reason.trim());

      // Append materials as JSON string
      formData.append("materials_json", JSON.stringify(materials));

      if (isManual) {
        formData.append("reference_inputs_json", JSON.stringify(referenceInputs));
        formData.append("outputs_json", JSON.stringify(outputs));
      }

      // Append captured images
      for (let i = 0; i < capturedImages.length; i++) {
        const img = capturedImages[i];
        const uri = img.uri;
        const filename = img.fileName || `report_${i}.jpg`;
        const mimeType = img.mimeType || "image/jpeg";
        formData.append("images", {
          uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
          name: filename,
          type: mimeType,
        } as any);
      }

      const res = await fetch(
        "https://mmes-sep490-84gr.onrender.com/api/Tasks/qr",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/plain",
          },
          body: formData,
        },
      );
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Không parse được dữ liệu từ server");
      }
      if (!res.ok) throw new Error(data?.message || "Tạo QR thất bại");
      if (stage.status === "Finished") {
        onFinishedRef.current();
        return false;
      }

      setQrData(data);
      setTokenCopied(false);
      setQrVisible(true);
      setCapturedImages([]); // Clear images after success
      setReason(""); // Clear reason after success
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
    if (!date) return "";
    return new Date(date).toLocaleDateString("vi-VN").split("T")[0];
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

  /*================= ACCESS RESTRICTION =================*/
  if (detail && !stage) {
    return (
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/logo_removed.png")}
            style={styles.logo}
          />
          <Text style={styles.company}>
            Công Ty TNHH Thương Mại Và Dịch Vụ{"\n"}In & Bao Bì Đại Phúc Hải
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: "#fee2e2", padding: 16, borderRadius: 50, marginBottom: 16 }}>
            <Ionicons name="lock-closed" size={40} color="#dc2626" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 8 }}>
            Không có quyền truy cập
          </Text>
          <Text style={{ fontSize: 14, color: "#4b5563", textAlign: "center", lineHeight: 20, marginBottom: 24 }}>
            Đơn hàng #{detail.order_code || id} không chứa công đoạn dành cho vai trò "{processName || "của bạn"}".
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: "#2563eb", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, elevation: 2 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Quay lại Trang chủ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /*================= UI =================*/
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/logo_removed.png")}
          style={styles.logo}
        />
        <Text style={styles.company}>
          Công Ty TNHH Thương Mại Và Dịch Vụ{"\n"}In & Bao Bì Đại Phúc Hải
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* BACK */}
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Chi tiết lệnh sản xuất</Text>
        </View>

        {/* ORDER CODE + STATUS BADGE */}
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>#{stage?.task_id ?? "--"}</Text>
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

        {/* PROCESS */}
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
          <View style={styles.metaItem}>
            <Feather name="calendar" size={18} color="#2563eb" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.metaLabel}>Hạn hoàn thành</Text>
              <Text style={styles.metaValue}>
                {formatDate(stage?.planned_end_time) || "--"}
              </Text>
            </View>
          </View>
        </View>

        {/* Hiển thị ảnh công đoạn */}
        {stage?.process_name && stageImages[stage.process_name] ? (
          <View style={styles.fileBox}>
            <Text style={styles.fileLabel}>
              Hình minh họa công đoạn {stage.process_name}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setLocalPreviewVisible(true)}
            >
              <Image
                source={stageImages[stage.process_name]}
                style={styles.fileImage}
              />
            </TouchableOpacity>
            <Text style={styles.fileHint}>Nhấn vào để xem chi tiết</Text>
          </View>
        ) : showPrintFile && detail.ready_print_file ? (
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
        ) : null}

        {/* PROCESS TIMELINE */}
        <ProcessTimeline stages={detail.stages} />

        {/* INFO BOX */}
        <View style={styles.infoBox}>
          {/* ✅ Hiển thị đầy đủ tất cả nguyên liệu đầu vào dạng bảng */}
          {stage?.input_materials && stage.input_materials.length > 0 ? (
            <View style={{ marginBottom: 12, marginTop: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Feather name="download" size={18} color="#4b5563" />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#374151",
                    marginLeft: 8,
                  }}
                >
                  Nguyên liệu đầu vào
                </Text>
              </View>
              {/* TABLE HEADER */}
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>Tên nguyên liệu</Text>
                <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>
                  Số lượng
                </Text>
                <Text style={[styles.th, { width: 60, textAlign: "center" }]}>
                  Đơn vị
                </Text>
              </View>
              {/* TABLE BODY */}
              {stage.input_materials.map((mat, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.tableRow,
                    idx % 2 === 0 && { backgroundColor: "#f9fafb" },
                  ]}
                >
                  <Text style={[styles.td, { flex: 2 }]}>
                    {mat.name || "Nguyên liệu"}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      { flex: 1, textAlign: "center", fontWeight: "600" },
                    ]}
                  >
                    {mat.quantity ?? 0}
                  </Text>
                  <Text style={[styles.td, { width: 60, textAlign: "center" }]}>
                    {mat.unit || "--"}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <InfoRow
              icon={<Feather name="download" size={18} color="#4b5563" />}
              label="Nguyên liệu đầu vào"
              value="--"
            />
          )}
          <InfoRow
            icon={<Ionicons name="cube-outline" size={18} color="#4b5563" />}
            label="Sản lượng mục tiêu"
            value={`${stage?.output_product?.quantity ?? "--"} ${stage?.output_product?.name ?? "--"}`}
          />
          <InfoRow
            icon={
              <Ionicons
                name="checkmark-done-outline"
                size={18}
                color="#4b5563"
              />
            }
            label="Thành phẩm thực tế"
            value={
              stage?.qty_good != null && stage.qty_good > 0
                ? `${stage.qty_good} ${stage?.output_product?.unit ?? ""}`
                : "--"
            }
            valueStyle={
              stage?.qty_good != null && stage.qty_good > 0
                ? { color: "#16a34a", fontWeight: "600" }
                : { color: "#9ca3af" }
            }
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
        ) : isStageReady ? (
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setQuantity(String(stage?.output_product?.quantity ?? ""));
              setQuantityError("");
              setModalVisible(true);
              if (stage?.task_id) fetchQrPrepare(stage.task_id);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="qr-code-outline" size={22} color="#fff" />
            <Text style={styles.buttonText}>Báo cáo hoàn thành</Text>
          </TouchableOpacity>
        ) : (
          // Unassigned / Scheduled — vàng nếu công đoạn trước hoàn thành, xám nếu chưa
          <TouchableOpacity
            style={[
              styles.readyButton,
              !isPrevStageFinished && {
                backgroundColor: "#9ca3af",
                shadowColor: "#9ca3af",
              },
            ]}
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
        )}
      </ScrollView>

      {/* INPUT MODAL */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: "85%" }]}>
            <Text style={styles.modalTitle}>
              Báo cáo công đoạn {stage?.process_name}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Nguyên liệu đầu vào — luôn hiển thị từ stage.input_materials */}
              {stage?.input_materials && stage.input_materials.length > 0 && (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionLabel}>Nguyên liệu đầu vào</Text>
                  {/* TABLE HEADER */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 2 }]}>
                      Tên nguyên liệu
                    </Text>
                    <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>
                      Số lượng
                    </Text>
                    <Text
                      style={[styles.th, { width: 60, textAlign: "center" }]}
                    >
                      Đơn vị
                    </Text>
                  </View>
                  {/* TABLE BODY */}
                  {stage.input_materials.map((mat, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.tableRow,
                        idx % 2 === 0 && { backgroundColor: "#f9fafb" },
                      ]}
                    >
                      <Text style={[styles.td, { flex: 2 }]}>
                        {mat.name || "Nguyên liệu"}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          { flex: 1, textAlign: "center", fontWeight: "600" },
                        ]}
                      >
                        {mat.quantity ?? 0}
                      </Text>
                      <Text
                        style={[styles.td, { width: 60, textAlign: "center" }]}
                      >
                        {mat.unit || "--"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {prepareLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#2563eb"
                  style={{ marginVertical: 16 }}
                />
              ) : (
                <>
                  {/* MANUAL TOGGLE / REQUIRED NOTICE */}
                  {qrPrepare && qrPrepare.can_use_manual_input && qrPrepare.manual_input_optional && !mustManual && (
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f0fdf4", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#bbf7d0", marginBottom: 16 }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#166534" }}>Báo cáo nhập tay</Text>
                        <Text style={{ fontSize: 11, color: "#15803d", marginTop: 2 }}>Tùy chọn tự nhập tay vật tư, BTP công đoạn</Text>
                      </View>
                      <TouchableOpacity
                        style={{
                          width: 48,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: useManualInputToggle ? "#16a34a" : "#d1d5db",
                          padding: 2,
                          justifyContent: "center",
                        }}
                        onPress={() => setUseManualInputToggle(!useManualInputToggle)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: "#fff",
                            alignSelf: useManualInputToggle ? "flex-end" : "flex-start",
                            shadowColor: "#000",
                            shadowOpacity: 0.2,
                            shadowRadius: 2,
                            elevation: 2,
                          }}
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  {mustManual && (
                    <View style={{ backgroundColor: "#eff6ff", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#bfdbfe", marginBottom: 16 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#1e40af" }}>Chế độ nhập tay bắt buộc</Text>
                      <Text style={{ fontSize: 11, color: "#1d4ed8", marginTop: 2 }}>
                        Công đoạn {qrPrepare?.is_group_production ? "ghép" : "này"} yêu cầu nhập tay chi tiết vật tư, BTP đầu vào và đầu ra.
                      </Text>
                    </View>
                  )}

                  {/* MATERIALS SECTION (MANUAL / ESTIMATE) */}
                  {qrPrepare &&
                    isManual &&
                    qrPrepare.consumable_materials.filter(
                      (mat) =>
                        !(
                          roleId === 7 &&
                          mat.material_name.toLowerCase().includes("kẽm")
                        ),
                    ).length > 0 && (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionLabel}>Báo cáo Nguyên vật liệu</Text>
                        {qrPrepare.consumable_materials
                          .filter(
                            (mat) =>
                              !(
                                roleId === 7 &&
                                mat.material_name.toLowerCase().includes("kẽm")
                              ),
                          )
                          .map((mat) => (
                            <View
                              key={mat.material_id}
                              style={{ backgroundColor: "#f9fafb", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 12 }}
                            >
                              <View style={styles.materialLabelRow}>
                                <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>
                                  {mat.material_name}
                                </Text>
                                <Text style={{ fontSize: 11, color: "#4b5563", fontWeight: "500" }}>
                                  Định mức: {mat.estimated_input_qty} {mat.unit}
                                </Text>
                              </View>

                              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 11, color: "#4b5563", marginBottom: 4, fontWeight: "600" }}>Lượng đã dùng</Text>
                                  <TextInput
                                    style={[
                                      styles.input,
                                      { backgroundColor: "#fff", marginBottom: 0 },
                                      materialErrors[mat.material_id] ? styles.inputError : null,
                                    ]}
                                    keyboardType="numeric"
                                    placeholder="Nhập lượng dùng"
                                    placeholderTextColor="#9ca3af"
                                    value={materialUsedQtys[mat.material_id] ?? ""}
                                    onChangeText={(text) => {
                                      const cleaned = text.replace(/[^0-9.]/g, "");
                                      setMaterialUsedQtys((prev) => ({ ...prev, [mat.material_id]: cleaned }));
                                      if (cleaned !== "" && Number(cleaned) > mat.estimated_input_qty) {
                                        setMaterialErrors((prev) => ({ ...prev, [mat.material_id]: `Vượt quá định mức (${mat.estimated_input_qty})` }));
                                      } else {
                                        setMaterialErrors((prev) => ({ ...prev, [mat.material_id]: "" }));
                                      }
                                    }}
                                  />
                                </View>

                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 11, color: "#4b5563", marginBottom: 4, fontWeight: "600" }}>Lượng dư hoàn kho</Text>
                                  <TextInput
                                    style={[
                                      styles.input,
                                      { backgroundColor: "#fff", marginBottom: 0 },
                                    ]}
                                    keyboardType="numeric"
                                    placeholder="Nhập lượng dư"
                                    placeholderTextColor="#9ca3af"
                                    value={materialLeftQtys[mat.material_id] ?? ""}
                                    onChangeText={(text) => {
                                      const cleaned = text.replace(/[^0-9.]/g, "");
                                      setMaterialLeftQtys((prev) => ({ ...prev, [mat.material_id]: cleaned }));
                                    }}
                                  />
                                </View>
                              </View>

                              {materialErrors[mat.material_id] ? (
                                <Text style={[styles.fieldError, { marginTop: 4, marginBottom: 0 }]}>
                                  {materialErrors[mat.material_id]}
                                </Text>
                              ) : null}
                            </View>
                          ))}
                      </View>
                    )}

                  {qrPrepare &&
                    !isManual &&
                    qrPrepare.consumable_materials.filter(
                      (mat) =>
                        !(
                          roleId === 7 &&
                          mat.material_name.toLowerCase().includes("kẽm")
                        ),
                    ).length > 0 && (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionLabel}>Nguyên liệu dư</Text>
                        {qrPrepare.consumable_materials
                          .filter(
                            (mat) =>
                              !(
                                roleId === 7 &&
                                mat.material_name.toLowerCase().includes("kẽm")
                              ),
                          )
                          .map((mat) => (
                            <View
                              key={mat.material_id}
                              style={styles.materialRow}
                            >
                              <View style={styles.materialLabelRow}>
                                <Text style={styles.materialName}>
                                  {mat.material_name}
                                </Text>
                                <Text style={styles.materialHint}>
                                  Đã xuất: {mat.estimated_input_qty} {mat.unit}
                                </Text>
                              </View>
                              <TextInput
                                style={[
                                  styles.input,
                                  materialErrors[mat.material_id]
                                    ? styles.inputError
                                    : null,
                                ]}
                                keyboardType="numeric"
                                placeholder={`Nhập lượng dư (Mặc định: 0)`}
                                placeholderTextColor="#9ca3af"
                                value={materialLeftQtys[mat.material_id] ?? ""}
                                onChangeText={(text) =>
                                  handleMaterialQtyChange(
                                    mat.material_id,
                                    mat.estimated_input_qty,
                                    text,
                                  )
                                }
                              />
                              {materialErrors[mat.material_id] ? (
                                <Text style={styles.fieldError}>
                                  {materialErrors[mat.material_id]}
                                </Text>
                              ) : null}
                            </View>
                          ))}
                      </View>
                    )}

                  {/* REFERENCE INPUTS SECTION */}
                  {isManual && qrPrepare && qrPrepare.reference_inputs && qrPrepare.reference_inputs.length > 0 && (
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionLabel}>Bán thành phẩm đầu vào (BTP)</Text>
                      {qrPrepare.reference_inputs.map((x) => (
                        <View
                          key={x.input_code}
                          style={{ backgroundColor: "#f9fafb", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 12 }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>
                            {x.input_name} ({x.input_code})
                          </Text>
                          <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 2, marginBottom: 8 }}>
                            Định mức ước lượng: {x.estimated_qty} {x.unit}
                          </Text>

                          <View style={{ flexDirection: "row", gap: 10 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: "#4b5563", marginBottom: 4, fontWeight: "600" }}>Lượng đã dùng</Text>
                              <TextInput
                                style={[styles.input, { backgroundColor: "#fff", marginBottom: 0 }]}
                                keyboardType="numeric"
                                placeholder="Nhập lượng dùng"
                                placeholderTextColor="#9ca3af"
                                value={refUsedQtys[x.input_code] ?? ""}
                                onChangeText={(text) => {
                                  const cleaned = text.replace(/[^0-9.]/g, "");
                                  setRefUsedQtys((prev) => ({ ...prev, [x.input_code]: cleaned }));
                                }}
                              />
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: "#4b5563", marginBottom: 4, fontWeight: "600" }}>Lượng dư</Text>
                              <TextInput
                                style={[styles.input, { backgroundColor: "#fff", marginBottom: 0 }]}
                                keyboardType="numeric"
                                placeholder="Nhập lượng dư"
                                placeholderTextColor="#9ca3af"
                                value={refLeftQtys[x.input_code] ?? ""}
                                onChangeText={(text) => {
                                  const cleaned = text.replace(/[^0-9.]/g, "");
                                  setRefLeftQtys((prev) => ({ ...prev, [x.input_code]: cleaned }));
                                }}
                              />
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* QUANTITY SECTION */}
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionLabel}>
                        Sản lượng Báo cáo
                      </Text>
                      <Text style={styles.unitText}>
                        Đơn vị tính: {qrPrepare?.qty_unit ?? stage?.output_product?.unit}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: "#4b5563", marginBottom: 4, fontWeight: "600" }}>Sản lượng đạt</Text>
                        <TextInput
                          style={[
                            styles.input,
                            quantityError ? styles.inputError : null,
                            { backgroundColor: "#fff", textAlign: "right", marginBottom: 0 },
                          ]}
                          keyboardType="numeric"
                          placeholder={`Mặc định: ${qrPrepare?.suggested_qty ?? stage?.output_product?.quantity ?? "--"}`}
                          placeholderTextColor="#9ca3af"
                          value={quantity}
                          onChangeText={handleQuantityChange}
                        />
                      </View>

                      {isManual && (
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: "#4b5563", marginBottom: 4, fontWeight: "600" }}>Sản lượng hỏng</Text>
                          <TextInput
                            style={[
                              styles.input,
                              { backgroundColor: "#fff", textAlign: "right", marginBottom: 0 },
                            ]}
                            keyboardType="numeric"
                            placeholder="Mặc định: 0"
                            placeholderTextColor="#9ca3af"
                            value={qtyBad}
                            onChangeText={(text) => {
                              const cleaned = text.replace(/[^0-9]/g, "");
                              setQtyBad(cleaned);
                            }}
                          />
                        </View>
                      )}
                    </View>

                    {quantityError ? (
                      <Text style={[styles.fieldError, { marginTop: 4, marginBottom: 0 }]}>{quantityError}</Text>
                    ) : null}
                  </View>

                  {/* IMAGE CAPTURE SECTION */}
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionLabel}>Ảnh báo cáo</Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 10,
                      }}
                    >
                      Chụp ảnh sản phẩm / công đoạn để báo cáo
                    </Text>

                    {/* Camera & Gallery buttons */}
                    <View style={imgStyles.btnRow}>
                      <TouchableOpacity
                        style={imgStyles.captureBtn}
                        onPress={takePhoto}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="camera" size={20} color="#fff" />
                        <Text style={imgStyles.captureBtnText}>Chụp ảnh</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          imgStyles.captureBtn,
                          { backgroundColor: "#6366f1" },
                        ]}
                        onPress={pickImage}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="images" size={20} color="#fff" />
                        <Text style={imgStyles.captureBtnText}>Thư viện</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Image thumbnails */}
                    {capturedImages.length > 0 && (
                      <View style={imgStyles.thumbRow}>
                        {capturedImages.map((img, idx) => (
                          <View key={idx} style={imgStyles.thumbWrap}>
                            <TouchableOpacity
                              activeOpacity={0.9}
                              onPress={() => {
                                setPreviewImageUri(img.uri);
                                setImagePreviewVisible(true);
                              }}
                            >
                              <Image
                                source={{ uri: img.uri }}
                                style={imgStyles.thumb}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={imgStyles.removeBtn}
                              onPress={() => removeImage(idx)}
                            >
                              <Ionicons
                                name="close-circle"
                                size={22}
                                color="#ef4444"
                              />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    {capturedImages.length > 0 && (
                      <Text
                        style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}
                      >
                        {capturedImages.length} ảnh đã chọn
                      </Text>
                    )}
                  </View>

                  {/* REASON SECTION */}
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionLabel}>Ghi chú / Lý do</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { minHeight: 60, textAlignVertical: "top" },
                      ]}
                      placeholder="Nhập lý do hoặc ghi chú (không bắt buộc)"
                      placeholderTextColor="#9ca3af"
                      value={reason}
                      onChangeText={setReason}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setModalVisible(false);
                  setCapturedImages([]);
                  setReason("");
                }}
              >
                <Text style={styles.cancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.okBtn,
                  (!!quantityError || prepareLoading) && styles.okBtnDisabled,
                ]}
                disabled={!!quantityError || prepareLoading}
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

      {/* QR MODAL — fixed with ScrollView + copy token */}
      <Modal transparent visible={qrVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrBox}>
            <Text style={styles.modalTitle}>
              QR Code {roleId ? `— ${getRoleName(roleId)}` : ""}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: "center", paddingBottom: 8 }}
            >
              {qrData && (
                <>
                  <View style={styles.qrWrapper}>
                    <QRCode value={qrData.token} size={200} />
                  </View>

                  <Text style={styles.qrQty}>
                    Số lượng: {qrData.qty_good_used}{" "}
                    {stage?.output_product.unit}
                  </Text>

                  {/* TOKEN BOX — truncated + copy button */}
                  <View style={styles.tokenBox}>
                    <Text style={styles.tokenLabel}>Mã xác nhận</Text>
                    <View style={styles.tokenRow}>
                      <Text
                        style={styles.tokenValue}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {qrData.token}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.copyBtn,
                          tokenCopied && styles.copyBtnSuccess,
                        ]}
                        onPress={() => copyToken(qrData.token)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={tokenCopied ? "checkmark" : "copy-outline"}
                          size={16}
                          color={tokenCopied ? "#16a34a" : "#2563eb"}
                        />
                        <Text
                          style={[
                            styles.copyBtnText,
                            tokenCopied && { color: "#16a34a" },
                          ]}
                        >
                          {tokenCopied ? "Đã copy" : "Copy"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              <Text
                style={[
                  styles.manualLabel,
                  { alignSelf: "flex-start", width: "100%" },
                ]}
              >
                Hoặc nhập token thủ công:
              </Text>
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
                style={[
                  styles.cancelBtn,
                  { marginTop: 10, alignSelf: "center" },
                ]}
                onPress={() => setQrVisible(false)}
              >
                <Text style={styles.cancelText}>Đóng</Text>
              </TouchableOpacity>
            </ScrollView>
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

      {/* IMAGE PREVIEW MODAL */}
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
      <Modal visible={localPreviewVisible} transparent>
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={{ position: "absolute", top: 50, right: 20, zIndex: 10 }}
            onPress={() => setLocalPreviewVisible(false)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {stage?.process_name && stageImages[stage.process_name] && (
            <Image
              source={stageImages[stage.process_name]}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
      {/* CAPTURED IMAGE PREVIEW MODAL */}
      <Modal visible={imagePreviewVisible} transparent>
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={{ position: "absolute", top: 50, right: 20, zIndex: 10 }}
            onPress={() => setImagePreviewVisible(false)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {previewImageUri ? (
            <Image
              source={{ uri: previewImageUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
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
        {label ? <Text style={infoRowStyles.label}>{label}</Text> : null}
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
    marginBottom: 16,
  },
  modalSub: { fontSize: 12, color: "#6b7280", marginBottom: 16 },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  materialRow: {
    marginBottom: 8,
  },
  materialLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  materialName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  materialHint: {
    fontSize: 11,
    color: "#9ca3af",
  },
  qrBox: {
    width: "88%",
    maxHeight: "85%",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
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
    marginBottom: 12,
  },
  tokenLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 6,
    textAlign: "center",
  },
  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tokenValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  copyBtnSuccess: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563eb",
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
    marginBottom: 4,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#f9fafb",
    width: "100%",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  fieldError: {
    color: "#ef4444",
    fontSize: 12,
    marginBottom: 6,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
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
  fileHint: { marginTop: 8, fontSize: 11, color: "#6b7280" },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: { width: "100%", height: "80%" },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  unitText: {
    fontSize: 12,
    color: "#6b7280",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },

  th: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },

  td: {
    fontSize: 13,
    color: "#111827",
  },
});

const imgStyles = StyleSheet.create({
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  captureBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  captureBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  thumbRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  thumbWrap: {
    position: "relative",
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#fff",
    borderRadius: 11,
  },
});
