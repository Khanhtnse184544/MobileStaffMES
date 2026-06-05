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
import { API_BASE_URL, SIGNALR_HUB_URL } from "../../constants/api";

const { width } = Dimensions.get("window");

/* ================= ROLE COLOR THEME ================= */

type RoleTheme = {
  primary: string;
  light: string;
  badge: string;
  badgeText: string;
  header: string;
  headerText: string;
  button: string;
  buttonLight: string;
};

const ROLE_THEMES: Record<number, RoleTheme> = {
  7: {
    primary: "#534AB7",
    light: "#EEEDFE",
    badge: "#CECBF6",
    badgeText: "#3C3489",
    header: "#EEEDFE",
    headerText: "#534AB7",
    button: "#534AB7",
    buttonLight: "#EEEDFE",
  },
  8: {
    primary: "#993C1D",
    light: "#FAECE7",
    badge: "#F5C4B3",
    badgeText: "#712B13",
    header: "#FAECE7",
    headerText: "#993C1D",
    button: "#993C1D",
    buttonLight: "#FAECE7",
  },
  9: {
    primary: "#185FA5",
    light: "#E6F1FB",
    badge: "#B5D4F4",
    badgeText: "#0C447C",
    header: "#E6F1FB",
    headerText: "#185FA5",
    button: "#185FA5",
    buttonLight: "#E6F1FB",
  },
  10: {
    primary: "#3B6D11",
    light: "#EAF3DE",
    badge: "#C0DD97",
    badgeText: "#27500A",
    header: "#EAF3DE",
    headerText: "#3B6D11",
    button: "#3B6D11",
    buttonLight: "#EAF3DE",
  },
  11: {
    primary: "#854F0B",
    light: "#FAEEDA",
    badge: "#FAC775",
    badgeText: "#633806",
    header: "#FAEEDA",
    headerText: "#854F0B",
    button: "#854F0B",
    buttonLight: "#FAEEDA",
  },
  12: {
    primary: "#0F6E56",
    light: "#E1F5EE",
    badge: "#9FE1CB",
    badgeText: "#085041",
    header: "#E1F5EE",
    headerText: "#0F6E56",
    button: "#0F6E56",
    buttonLight: "#E1F5EE",
  },
  13: {
    primary: "#993556",
    light: "#FBEAF0",
    badge: "#F4C0D1",
    badgeText: "#72243E",
    header: "#FBEAF0",
    headerText: "#993556",
    button: "#993556",
    buttonLight: "#FBEAF0",
  },
  14: {
    primary: "#A32D2D",
    light: "#FCEBEB",
    badge: "#F7C1C1",
    badgeText: "#791F1F",
    header: "#FCEBEB",
    headerText: "#A32D2D",
    button: "#A32D2D",
    buttonLight: "#FCEBEB",
  },
  15: {
    primary: "#085041",
    light: "#E1F5EE",
    badge: "#5DCAA5",
    badgeText: "#04342C",
    header: "#E1F5EE",
    headerText: "#085041",
    button: "#085041",
    buttonLight: "#E1F5EE",
  },
  19: {
    primary: "#534AB7",
    light: "#EEEDFE",
    badge: "#CECBF6",
    badgeText: "#3C3489",
    header: "#EEEDFE",
    headerText: "#534AB7",
    button: "#534AB7",
    buttonLight: "#EEEDFE",
  },
  20: {
    primary: "#3B6D11",
    light: "#EAF3DE",
    badge: "#C0DD97",
    badgeText: "#27500A",
    header: "#EAF3DE",
    headerText: "#3B6D11",
    button: "#3B6D11",
    buttonLight: "#EAF3DE",
  },
  21: {
    primary: "#993556",
    light: "#FBEAF0",
    badge: "#F4C0D1",
    badgeText: "#72243E",
    header: "#FBEAF0",
    headerText: "#993556",
    button: "#993556",
    buttonLight: "#FBEAF0",
  },
};

const DEFAULT_THEME: RoleTheme = {
  primary: "#2563eb",
  light: "#eff6ff",
  badge: "#bfdbfe",
  badgeText: "#1e40af",
  header: "#fff",
  headerText: "#374151",
  button: "#2563eb",
  buttonLight: "#eff6ff",
};

const getRoleTheme = (roleId: number | null): RoleTheme =>
  roleId && ROLE_THEMES[roleId] ? ROLE_THEMES[roleId] : DEFAULT_THEME;

/* ================= TYPES ================= */

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
  qty_bad?: number;
  input_materials: {
    name: string;
    code: string;
    quantity: number;
    estimated_quantity: number;
    actual_quantity: number;
    unit: string;
  }[];
  output_product: {
    name: string;
    code: string;
    quantity: number;
    actual_quantity: number;
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
  _isPaperInPrint?: boolean;
};

type ReferenceInput = {
  input_code: string;
  input_name: string;
  unit: string;
  estimated_qty: number;
  actual_qty_prev_stage?: number | null;
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
  reference_inputs: ReferenceInput[];
  is_group_production?: boolean;
  allow_manual_input?: boolean;
  can_use_manual_input?: boolean;
  manual_input_optional?: boolean;
  production_output_unit?: string;
};

type InputMaterialRow = Stage["input_materials"][number];

function findReferenceInputForMaterial(
  mat: Pick<InputMaterialRow, "code" | "name">,
  refs?: ReferenceInput[],
): ReferenceInput | undefined {
  if (!refs?.length) return undefined;
  return (
    refs.find(
      (r) =>
        r.input_code === mat.code ||
        r.input_name?.toLowerCase() === mat.name?.toLowerCase(),
    ) ??
    (mat.code === "PREV" && refs.length === 1 ? refs[0] : undefined)
  );
}

function getInputMaterialActualQty(
  mat: InputMaterialRow,
  ref?: ReferenceInput,
): number | null {
  if (
    mat.actual_quantity != null &&
    !Number.isNaN(Number(mat.actual_quantity))
  ) {
    return Number(mat.actual_quantity);
  }
  if (
    ref?.actual_qty_prev_stage != null &&
    !Number.isNaN(Number(ref.actual_qty_prev_stage))
  ) {
    return Number(ref.actual_qty_prev_stage);
  }
  return null;
}

function getInputMaterialPrevStageQty(
  mat: InputMaterialRow,
  ref?: ReferenceInput,
): number | null {
  if (mat.code !== "PREV") return null;
  return getInputMaterialActualQty(mat, ref);
}

/* ================= QR MODE HELPERS (mirrors web utils/productionReport) ================= */

type QrMode = "estimate" | "manual";

function normalizeProcessName(name: string | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isRaloStage(processName: string | undefined): boolean {
  return normalizeProcessName(processName).includes("ralo");
}

function isCutStage(processName: string | undefined): boolean {
  const p = normalizeProcessName(processName);
  return p.includes("cat");
}

function isPrintOrAfter(processName: string | undefined): boolean {
  const p = normalizeProcessName(processName);
  // Before print: Ralo, Cắt. From In and after must always allow manual (BTP input).
  if (p.includes("ralo") || p.includes("cat") || p.includes("cắt"))
    return false;

  const ordered = [
    "ralo",
    "cat",
    "in",
    "phu",
    "can",
    "boi",
    "be",
    "dut",
    "dan",
  ];
  const idx = ordered.findIndex((k) => p.includes(k));
  const idxPrint = ordered.indexOf("in");
  if (idx >= 0) return idx >= idxPrint;

  // Fallback: unknown stages are treated as "after print"
  return p.length > 0;
}

function resolveQrMode(
  qrPrepare: QrPrepare | null,
  userToggleManual: boolean,
): QrMode {
  if (!qrPrepare) return "estimate";
  if (
    qrPrepare.is_group_production === true ||
    qrPrepare.allow_manual_input === true
  )
    return "manual";
  if (
    qrPrepare.can_use_manual_input === true &&
    qrPrepare.manual_input_optional === true &&
    userToggleManual
  )
    return "manual";
  return "estimate";
}

function isManualInputMode(mode: QrMode): boolean {
  return mode === "manual";
}

function canShowManualToggle(
  qrPrepare: QrPrepare | null,
  processName: string | undefined,
): boolean {
  if (!qrPrepare) return false;
  if (qrPrepare.is_group_production || qrPrepare.allow_manual_input)
    return false; // forced manual — no toggle needed
  if (!qrPrepare.can_use_manual_input || !qrPrepare.manual_input_optional)
    return false;
  const lower = (processName ?? "").toLowerCase();
  const excluded = ["ralo", "cắt", "cat"];
  if (excluded.some((k) => lower.includes(k))) return false;
  return true;
}

function resolveQtyGoodMax(
  qrPrepare: QrPrepare | null,
  fallbackMax: number,
): number {
  if (qrPrepare?.max_allowed && qrPrepare.max_allowed > 0)
    return qrPrepare.max_allowed;
  return fallbackMax;
}

function resolveFinalQtyGood(
  inputValue: string,
  suggestedQty?: number,
): number {
  const parsed = parseFloat(inputValue);
  if (!isNaN(parsed) && parsed > 0) return parsed;
  return suggestedQty ?? 0;
}

function parseReportQty(val: string | undefined): number {
  if (val === undefined || val === "") return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function resolveIsStock(qtyLeft: number): boolean {
  return qtyLeft > 0;
}

/** Returns { left, used, error } after validating against max */
function syncQtyFromLeftInput(
  estimatedQty: number,
  rawInput: string,
): { left: string; used: string; error: string } {
  if (rawInput === "")
    return { left: "", used: String(estimatedQty), error: "" };
  const leftVal = parseFloat(rawInput);
  if (isNaN(leftVal) || leftVal < 0) {
    return {
      left: rawInput,
      used: String(estimatedQty),
      error: "Số lượng không được âm",
    };
  }
  if (leftVal > estimatedQty) {
    return {
      left: String(estimatedQty),
      used: "0",
      error: `Tối đa ${estimatedQty}`,
    };
  }
  const used = parseFloat((estimatedQty - leftVal).toFixed(4));
  return { left: rawInput, used: String(used), error: "" };
}

/*================= PROCESS TIMELINE COMPONENT =================*/
function ProcessTimeline({
  stages,
  theme,
}: {
  stages: Stage[];
  theme: RoleTheme;
}) {
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
          bg: theme.primary,
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
            {
              width: `${progressPercent}%` as any,
              backgroundColor: theme.primary,
            },
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
                      isCurrent && {
                        borderWidth: 2,
                        borderColor: theme.primary,
                      },
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
                      <View
                        style={[
                          tlStyles.currentBadge,
                          { backgroundColor: theme.light },
                        ]}
                      >
                        <Text
                          style={[
                            tlStyles.currentBadgeText,
                            { color: theme.badgeText },
                          ]}
                        >
                          HIỆN TẠI
                        </Text>
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
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  title: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 2 },
  subtitle: { fontSize: 12, color: "#6b7280", marginBottom: 12 },
  progressBarBg: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: { height: 6, borderRadius: 3 },
  progressText: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 16,
    textAlign: "right",
  },
  stageList: {},
  stageRow: { flexDirection: "row", alignItems: "flex-start" },
  dotCol: { alignItems: "center", width: 28, marginRight: 10 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
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
  connector: { width: 2, flex: 1, minHeight: 24 },
  stageContent: { flex: 1, paddingBottom: 16 },
  stageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  stageName: { fontSize: 14, fontWeight: "500", color: "#374151" },
  stageNameCurrent: { color: "#111827", fontWeight: "700" },
  currentBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  currentBadgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  stageStatus: { fontSize: 12, marginTop: 2, fontWeight: "500" },
  stageMeta: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
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

  const [qrPrepare, setQrPrepare] = useState<QrPrepare | null>(null);
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [createQrLoading, setCreateQrLoading] = useState(false);

  // --- Material state (mirrors web) ---
  const [materialLeftQtys, setMaterialLeftQtys] = useState<{
    [id: number]: string;
  }>({});
  const [materialUsedQtys, setMaterialUsedQtys] = useState<{
    [id: number]: string;
  }>({});
  const [materialErrors, setMaterialErrors] = useState<{
    [id: number]: string;
  }>({});

  // --- Reference inputs (BTP) state ---
  const [refUsedQtys, setRefUsedQtys] = useState<{ [code: string]: string }>(
    {},
  );
  const [refLeftQtys, setRefLeftQtys] = useState<{ [code: string]: string }>(
    {},
  );
  const [refErrors, setRefErrors] = useState<{ [code: string]: string }>({});

  const [qtyBad, setQtyBad] = useState("0");
  const [useManualInputToggle, setUseManualInputToggle] = useState(false);

  const [capturedImages, setCapturedImages] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string>("");

  const [reason, setReason] = useState("");
  const [tokenCopied, setTokenCopied] = useState(false);
  const [roleId, setRoleId] = useState<number | null>(null);

  const theme = getRoleTheme(roleId);

  const onFinishedRef = useRef<() => void>(() => {});
  onFinishedRef.current = () => {
    setQrVisible(false);
    setModalVisible(false);
    setSuccessVisible(true);
  };

  const getAllowedProcessesByRole = (roleId?: number | null): string[] => {
    switch (roleId) {
      case 7:
        return ["Ralo"];
      case 8:
        return ["Cắt"];
      case 9:
        return ["In"];
      case 10:
        return ["Phủ"];
      case 11:
        return ["Cán"];
      case 12:
        return ["Bồi"];
      case 13:
        return ["Bế"];
      case 14:
        return ["Dứt"];
      case 15:
        return ["Dán"];
      case 19:
        return ["Ralo", "Cắt", "In"];
      case 20:
        return ["Phủ", "Cán", "Bồi"];
      case 21:
        return ["Bế", "Dứt", "Dán"];
      default:
        return [];
    }
  };

  const allowedProcesses = getAllowedProcessesByRole(roleId);

  const stage = React.useMemo(() => {
    if (!detail?.stages || allowedProcesses.length === 0) return null;
    const orderAllowedStages = detail.stages.filter((s) =>
      allowedProcesses.some(
        (p) => p.toLowerCase() === s.process_name?.toLowerCase(),
      ),
    );
    if (orderAllowedStages.length === 0) return null;
    const activeStage = orderAllowedStages.find((s) => s.status !== "Finished");
    return activeStage || orderAllowedStages[orderAllowedStages.length - 1];
  }, [detail?.stages, allowedProcesses]);

  const shouldExcludeMaterial = (matName: string) => {
    const lowerName = matName.toLowerCase();
    const lowerProcess = (stage?.process_name || "").toLowerCase();

    if (
      lowerProcess === "in" &&
      (lowerName.includes("giấy") || lowerName.includes("giay"))
    )
      return true;
    return false;
  };

  const filteredStages = React.useMemo(() => {
    if (!detail?.stages) return [];
    let list = detail.stages.filter(
      (s: any) =>
        s.status !== null &&
        s.status !== undefined &&
        String(s.status).toLowerCase() !== "groupedwaiting",
    );
    if (type === "group") {
      const targetProdId =
        (stage as any)?.prod_id ||
        (stage as any)?.production_id ||
        (stage as any)?.productionId;
      if (targetProdId) {
        list = list.filter(
          (s: any) =>
            s.prod_id === targetProdId ||
            s.production_id === targetProdId ||
            s.productionId === targetProdId,
        );
      }
    }
    return list;
  }, [detail?.stages, stage, id, type]);

  const isStageFinished = stage?.status === "Finished";
  const isStageReady = stage?.status === "Ready";
  const isStageScheduled = stage?.status === "Scheduled";
  const isStageUnassigned = stage?.status === "Unassigned";

  const currentStageIndex =
    filteredStages?.findIndex((s) => s.task_id === stage?.task_id) ?? -1;
  const isPrevStageFinished =
    currentStageIndex <= 0 ||
    filteredStages?.[currentStageIndex - 1]?.status === "Finished";

  const showPrintFile = roleId === 9 || stage?.process_name === "In";
  const isGroupOrder = type === "group";

  // --- Resolve QR mode (mirrors web) ---
  const forceSemiFinishedInput = isPrintOrAfter(stage?.process_name);
  const effectiveManualToggle = forceSemiFinishedInput
    ? true
    : useManualInputToggle;
  const qrMode = resolveQrMode(qrPrepare, effectiveManualToggle);
  const isManual = isManualInputMode(qrMode);
  const showManualToggle = canShowManualToggle(qrPrepare, stage?.process_name);

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
      case 19:
        return "Phòng ban 1";
      case 20:
        return "Phòng ban 2";
      case 21:
        return "Phòng ban 3";
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

  // ---------- Quantity validation (mirrors web) ----------
  const handleQuantityChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    if (cleaned === "") {
      setQuantity("");
      setQuantityError("");
      return;
    }
    const goodVal = Number(cleaned);

    // Check against reference_inputs prev actual (group production)
    const prevActual = qrPrepare?.reference_inputs?.[0]?.actual_qty_prev_stage;
    if (prevActual != null) {
      const min = Math.floor(prevActual * 0.85);
      if (goodVal < min || goodVal > prevActual) {
        setQuantityError(
          `Phải từ ${min.toLocaleString("vi-VN")} đến ${Number(prevActual).toLocaleString("vi-VN")}`,
        );
      } else {
        setQuantityError("");
      }
      setQuantity(cleaned);
      return;
    }

    if (goodVal <= 0) {
      setQuantityError("Số lượng phải lớn hơn 0");
      setQuantity(cleaned);
      return;
    }
    const maxQty = resolveQtyGoodMax(
      qrPrepare,
      stage?.output_product.quantity ?? 99999999,
    );
    if (goodVal > maxQty) {
      setQuantityError(`Số lượng không được vượt quá ${maxQty}`);
      setQuantity(String(maxQty));
    } else {
      setQuantityError("");
      setQuantity(cleaned);
    }
  };

  // ---------- Material handlers (mirrors web syncQtyFromLeftInput) ----------
  const handleMaterialLeftChange = (
    materialId: number,
    estimated: number,
    text: string,
  ) => {
    const synced = syncQtyFromLeftInput(estimated, text);
    setMaterialLeftQtys((prev) => ({ ...prev, [materialId]: synced.left }));
    setMaterialUsedQtys((prev) => ({ ...prev, [materialId]: synced.used }));
    setMaterialErrors((prev) => ({ ...prev, [materialId]: synced.error }));
  };

  // Manual mode: editing "used" field syncs "left"
  const handleMaterialUsedChange = (
    materialId: number,
    estimated: number,
    text: string,
  ) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    const numVal = parseFloat(cleaned);
    setMaterialUsedQtys((prev) => ({ ...prev, [materialId]: cleaned }));
    if (cleaned === "" || isNaN(numVal)) {
      setMaterialLeftQtys((prev) => ({
        ...prev,
        [materialId]: String(estimated),
      }));
      setMaterialErrors((prev) => ({ ...prev, [materialId]: "" }));
      return;
    }
    if (numVal < 0) {
      setMaterialErrors((prev) => ({
        ...prev,
        [materialId]: "Số lượng không được âm",
      }));
      return;
    }
    if (numVal > estimated) {
      setMaterialUsedQtys((prev) => ({
        ...prev,
        [materialId]: String(estimated),
      }));
      setMaterialLeftQtys((prev) => ({ ...prev, [materialId]: "0" }));
      setMaterialErrors((prev) => ({
        ...prev,
        [materialId]: `Vượt quá định mức (${estimated})`,
      }));
      return;
    }
    const left = parseFloat((estimated - numVal).toFixed(4));
    setMaterialLeftQtys((prev) => ({ ...prev, [materialId]: String(left) }));
    setMaterialErrors((prev) => ({ ...prev, [materialId]: "" }));
  };

  // ---------- Reference input handlers (mirrors web) ----------
  const handleRefLeftChange = (ref: ReferenceInput, text: string) => {
    const val = text.replace(/[^0-9.]/g, "");
    const leftVal = val === "" ? 0 : Number(val);
    const prevActual = ref.actual_qty_prev_stage;

    if (prevActual != null) {
      const maxLeft = prevActual * 0.15;
      if (val !== "" && leftVal > maxLeft) {
        setRefErrors((prev) => ({
          ...prev,
          [ref.input_code]: `Không được vượt ${Math.floor(maxLeft).toLocaleString("vi-VN")} (15% TT CĐ trước)`,
        }));
      } else {
        setRefErrors((prev) => ({ ...prev, [ref.input_code]: "" }));
      }
      // Sync qty_good = actual_prev - leftVal
      const newQtyGood = Math.max(0, prevActual - leftVal);
      setQuantity(String(newQtyGood));
      setQuantityError("");
    } else {
      const maxVal = Number(ref.estimated_qty || 0);
      const synced = syncQtyFromLeftInput(maxVal, val);
      setRefErrors((prev) => ({ ...prev, [ref.input_code]: synced.error }));
    }

    setRefLeftQtys((prev) => ({ ...prev, [ref.input_code]: val }));
    const usedVal =
      prevActual != null
        ? String(Math.max(0, prevActual - leftVal))
        : String(Math.max(0, Number(ref.estimated_qty || 0) - leftVal));
    setRefUsedQtys((prev) => ({ ...prev, [ref.input_code]: usedVal }));
  };

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
    if (!result.canceled && result.assets.length > 0)
      setCapturedImages((prev) => [...prev, ...result.assets].slice(0, 4));
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
      selectionLimit: 4,
    });
    if (!result.canceled && result.assets.length > 0)
      setCapturedImages((prev) => [...prev, ...result.assets].slice(0, 4));
  };

  const removeImage = (index: number) =>
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));

  const copyToken = async (token: string) => {
    await Clipboard.setStringAsync(token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("jwt");
      const url =
        type === "group"
          ? `${API_BASE_URL}/api/GroupProductions/${id}/detail`
          : `${API_BASE_URL}/api/Productions/detail/production/${id}`;
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
                quantity: m.estimated_qty ?? m.estimated_quantity ?? 0,
                estimated_quantity:
                  m.estimated_qty ?? m.estimated_quantity ?? 0,
                actual_quantity: m.actual_qty ?? m.actual_quantity ?? null,
                unit: m.unit,
              })) || [],
            output_product:
              s.outputs && s.outputs.length > 0
                ? {
                    name: s.outputs[0].name,
                    code: s.outputs[0].code,
                    quantity: s.outputs[0].estimated_qty ?? 0,
                    actual_quantity: s.outputs[0].actual_qty ?? 0,
                    unit: s.outputs[0].unit,
                  }
                : {
                    name: "",
                    code: "",
                    quantity: 0,
                    actual_quantity: 0,
                    unit: "",
                  },
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

  useEffect(() => {
    if (stage?.task_id && stage.status !== "Finished") {
      fetchQrPrepare(stage.task_id); // 👈 fetch sớm để có ref data
    }
  }, [stage?.task_id, roleId]);

  const fetchQrPrepare = async (taskId: number) => {
    try {
      setPrepareLoading(true);
      const token = await SecureStore.getItemAsync("jwt");
      const res = await fetch(
        `${API_BASE_URL}/api/Tasks/qr-prepare/${taskId}`,
        {
          headers: { Authorization: `Bearer ${token}`, Accept: "*/*" },
        },
      );
      const data: QrPrepare = await res.json();

      // Mark paper materials in print stage (mirrors web)
      const isPrintStage = stage?.process_name?.toLowerCase().includes("in");
      if (isPrintStage && data.consumable_materials) {
        data.consumable_materials = data.consumable_materials.map((m) => {
          const name = m.material_name?.toLowerCase() || "";
          const isPaper = name.includes("giấy") || name.includes("giay");
          return isPaper ? { ...m, _isPaperInPrint: true } : m;
        });
      }

      setQrPrepare(data);

      // Init material states
      const initLeft: { [id: number]: string } = {};
      const initUsed: { [id: number]: string } = {};
      (data.consumable_materials || []).forEach((m) => {
        if (m._isPaperInPrint) {
          initUsed[m.material_id] = "0";
          initLeft[m.material_id] = "0";
        } else {
          initUsed[m.material_id] = String(m.estimated_input_qty);
          initLeft[m.material_id] = "0";
        }
      });
      setMaterialUsedQtys(initUsed);
      setMaterialLeftQtys(initLeft);
      setMaterialErrors({});

      // Init reference inputs state
      const initRefUsed: { [code: string]: string } = {};
      const initRefLeft: { [code: string]: string } = {};
      (data.reference_inputs || []).forEach((x) => {
        initRefUsed[x.input_code] =
          x.actual_qty_prev_stage != null
            ? String(x.actual_qty_prev_stage)
            : String(x.estimated_qty ?? 0);
        initRefLeft[x.input_code] = "0";
      });
      setRefUsedQtys(initRefUsed);
      setRefLeftQtys(initRefLeft);
      setRefErrors({});

      setQtyBad("0");
      setUseManualInputToggle(false);
      setMaterialErrors({});

      if (data.suggested_qty && data.suggested_qty > 0)
        setQuantity(String(data.suggested_qty));
    } catch (err) {
      console.log("Fetch qr-prepare error:", err);
    } finally {
      setPrepareLoading(false);
    }
  };

  const finishTask = async () => {
    try {
      if (!manualToken) {
        alert("Vui lòng nhập token");
        return;
      }
      setFinishLoading(true);
      const token = await SecureStore.getItemAsync("jwt");
      const res = await fetch(`${API_BASE_URL}/api/Tasks/finish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: manualToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Finish thất bại");
      setManualToken("");
      onFinishedRef.current();
      fetchDetail();
    } catch (err: any) {
      alert(err.message || "Có lỗi xảy ra");
    } finally {
      setFinishLoading(false);
    }
  };

  const setTaskReady = async () => {
    try {
      if (!stage) return;
      setReadyLoading(true);
      const token = await SecureStore.getItemAsync("jwt");
      const res = await fetch(`${API_BASE_URL}/api/Tasks/ready`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "*/*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task_id: stage.task_id }),
      });
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
      setErrorMessage(err.message || "Có lỗi xảy ra");
      setErrorVisible(true);
    } finally {
      setReadyLoading(false);
    }
  };

  useEffect(() => {
    let connection: signalR.HubConnection;
    const startSignalR = async () => {
      const token = await SecureStore.getItemAsync("jwt");
      connection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_HUB_URL, { accessTokenFactory: () => token || "" })
        .withAutomaticReconnect()
        .build();
      connection.on("update-ui", (data) => {
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
      connection.on("update-ui", () => {
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

  // ============================================================
  // createQr — full validation mirroring web handleCreateQr
  // ============================================================
  const createQr = async (): Promise<boolean> => {
    try {
      if (!stage || !stage.task_id || stage.task_id <= 0) {
        setErrorMessage("Task không hợp lệ. Vui lòng thử lại.");
        setErrorVisible(true);
        return false;
      }
      if (stage.status === "Finished") {
        onFinishedRef.current();
        return false;
      }

      const forceSemiFinishedInput = isPrintOrAfter(stage?.process_name);
      const effectiveManualToggle = forceSemiFinishedInput
        ? true
        : useManualInputToggle;
      const mode = resolveQrMode(qrPrepare, effectiveManualToggle);
      const manualMode = isManualInputMode(mode);

      // --- Validate consumable materials ---
      if (qrPrepare && qrPrepare.consumable_materials.length > 0) {
        const unmapped = qrPrepare.consumable_materials.filter(
          (m) =>
            !shouldExcludeMaterial(m.material_name) &&
            !m._isPaperInPrint &&
            !m.is_mapped,
        );
        if (unmapped.length > 0) {
          setErrorMessage(
            `Các NVL sau chưa được map:\n${unmapped.map((m) => `• ${m.material_name}`).join("\n")}`,
          );
          setErrorVisible(true);
          return false;
        }
        for (const mat of qrPrepare.consumable_materials) {
          if (shouldExcludeMaterial(mat.material_name) || mat._isPaperInPrint)
            continue;
          if (materialErrors[mat.material_id]) return false;
        }
      }

      // --- Validate reference inputs ---
      if (manualMode && qrPrepare?.reference_inputs?.length) {
        for (const ref of qrPrepare.reference_inputs) {
          if (refErrors[ref.input_code]) {
            setErrorMessage(
              `Lỗi BTP ${ref.input_name}: ${refErrors[ref.input_code]}`,
            );
            setErrorVisible(true);
            return false;
          }
        }
      }

      // --- Resolve qty_good ---
      const defaultQty =
        qrPrepare?.suggested_qty ?? stage?.output_product?.quantity ?? 0;
      const qty = quantity ? Number(quantity) : defaultQty;
      if (isNaN(qty) || qty < 0) {
        setErrorMessage("Số lượng không hợp lệ");
        setErrorVisible(true);
        return false;
      }
      if (quantityError) {
        setErrorMessage(quantityError);
        setErrorVisible(true);
        return false;
      }

      const badQty = Number(qtyBad || 0);
      const token = await SecureStore.getItemAsync("jwt");

      const outputCode = qrPrepare?.process_code ?? stage?.process_code ?? "";
      const outputName = `BTP sau ${qrPrepare?.process_name ?? stage?.process_name ?? ""}`;
      const outputUnit =
        qrPrepare?.production_output_unit ??
        qrPrepare?.qty_unit ??
        stage?.output_product?.unit ??
        "";

      // --- Build materials list ---
      // const hasMaterials =
      //   (qrPrepare?.consumable_materials ?? []).filter(
      //     (m) => !shouldExcludeMaterial(m.material_name) && !m._isPaperInPrint,
      //   ).length > 0;

      // --- Build materials list ---
      type MaterialEntry = {
        material_id: number;
        quantity_used: number;
        quantity_left: number;
        is_stock: boolean;
      };

      // Lọc ra các NVL thực sự cần gửi (không bị exclude, không phải giấy in)
      // --- Validate consumable materials ---
      // Chỉ validate những NVL thực sự cần nhập (không exclude, không phải giấy in)
      const activeMaterialsForSubmit = (
        qrPrepare?.consumable_materials ?? []
      ).filter(
        (m) => !shouldExcludeMaterial(m.material_name) && !m._isPaperInPrint,
      );

      if (activeMaterialsForSubmit.length > 0) {
        const unmapped = activeMaterialsForSubmit.filter((m) => !m.is_mapped);
        if (unmapped.length > 0) {
          setErrorMessage(
            `Các NVL sau chưa được map:\n${unmapped.map((m) => `• ${m.material_name}`).join("\n")}`,
          );
          setErrorVisible(true);
          return false;
        }
        for (const mat of activeMaterialsForSubmit) {
          if (materialErrors[mat.material_id]) return false;
        }
      }

      let materials: MaterialEntry[];
      const processIsRalo = isRaloStage(stage?.process_name);
      const processIsCut = isCutStage(stage?.process_name);

      if (activeMaterialsForSubmit.length === 0) {
        materials = [];
      } else if (processIsCut) {
        materials = activeMaterialsForSubmit.map((mat) => ({
          material_id: mat.material_id,
          quantity_used: mat.estimated_input_qty,
          quantity_left: 0,
          is_stock: false,
        }));
      } else if (processIsRalo) {
        for (const mat of activeMaterialsForSubmit) {
          const qtyUsed = parseReportQty(materialUsedQtys[mat.material_id]);
          if (qtyUsed <= 0) {
            setErrorMessage(
              `Vui lòng nhập lượng sử dụng cho NVL: ${mat.material_name}`,
            );
            setErrorVisible(true);
            return false;
          }
        }
        materials = activeMaterialsForSubmit.map((mat) => ({
          material_id: mat.material_id,
          quantity_used: parseReportQty(materialUsedQtys[mat.material_id]),
          quantity_left: 0,
          is_stock: false,
        }));
      } else {
        materials = activeMaterialsForSubmit.map((mat) => {
          const qtyLeft = parseReportQty(materialLeftQtys[mat.material_id]);
          const qtyUsed = manualMode
            ? parseReportQty(materialUsedQtys[mat.material_id])
            : parseFloat((mat.estimated_input_qty - qtyLeft).toFixed(4));
          return {
            material_id: mat.material_id,
            quantity_used: qtyUsed,
            quantity_left: qtyLeft,
            is_stock: resolveIsStock(qtyLeft),
          };
        });
      }

      // --- Build reference inputs list ---
      // Nếu không có BTP → gửi 1 entry default
      type RefEntry = {
        input_code: string;
        input_name: string;
        unit: string;
        quantity_used: number;
        quantity_left: number;
        is_stock: boolean;
      };

      let referenceInputs: RefEntry[];
      const hasRefs =
        manualMode && (qrPrepare?.reference_inputs ?? []).length > 0;

      if (!hasRefs) {
        referenceInputs = [
          {
            input_code: "null",
            input_name: "Không sử dụng bán thành phẩm",
            unit: "null",
            quantity_used: 0,
            quantity_left: 0,
            is_stock: false,
          },
        ];
      } else {
        referenceInputs = (qrPrepare!.reference_inputs ?? []).map((x) => ({
          input_code: x.input_code,
          input_name: x.input_name,
          unit: x.unit,
          quantity_used: parseReportQty(refUsedQtys[x.input_code]),
          quantity_left: parseReportQty(refLeftQtys[x.input_code]),
          is_stock: resolveIsStock(parseReportQty(refLeftQtys[x.input_code])),
          actual_qty_prev_stage: x.actual_qty_prev_stage ?? 0,
        }));
      }

      // --- Build FormData (flat repeated fields — matches curl) ---
      const formData = new FormData();

      formData.append("task_id", String(stage.task_id));
      formData.append("ttl_minutes", "10000");
      formData.append("qty_good", String(qty));
      formData.append("use_manual_input", manualMode ? "true" : "false");
      formData.append("reason", reason.trim());

      // Reference inputs — flat repeated
      referenceInputs.forEach((ref) => {
        formData.append("input_code", ref.input_code);
        formData.append("input_name", ref.input_name);
        formData.append("quantity_used", String(ref.quantity_used));
        formData.append("quantity_left", String(ref.quantity_left));
        formData.append("unit", ref.unit); // unit[0] = input unit
      });

      // Output — flat fields
      formData.append("output_code", outputCode);
      formData.append("output_name", outputName);
      formData.append("unit", outputUnit); // unit[n] = output unit
      formData.append("quantity_good", String(qty));
      formData.append("quantity_bad", String(badQty));

      // Materials — flat repeated
      materials.forEach((mat) => {
        formData.append("material_id", String(mat.material_id));
        formData.append("mat_quantity_used", String(mat.quantity_used));
        formData.append("mat_quantity_left", String(mat.quantity_left));
        formData.append("is_stock", mat.is_stock ? "true" : "false");
      });

      // Images
      for (let i = 0; i < capturedImages.length; i++) {
        const img = capturedImages[i];
        formData.append("images", {
          uri:
            Platform.OS === "android"
              ? img.uri
              : img.uri.replace("file://", ""),
          name: img.fileName || `report_${i}.jpg`,
          type: img.mimeType || "image/jpeg",
        } as any);
      }

      setCreateQrLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/Tasks/qr`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, Accept: "text/plain" },
          body: formData,
        });
        const text = await res.text();
        let data;
        console.log("QR Data:", formData);
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
        setCapturedImages([]);
        setReason("");
        return true;
      } finally {
        setCreateQrLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Có lỗi xảy ra khi tạo QR");
      setErrorVisible(true);
      return false;
    }
  };

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
        return theme.primary;
      case "Completed":
      case "Finished":
        return "#16a34a";
      default:
        return "#6b7280";
    }
  };

  if (loading || !detail) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color={theme.primary}
          style={{ marginTop: 40 }}
        />
        <Text style={{ textAlign: "center", marginTop: 12, color: "#6b7280" }}>
          Đang tải dữ liệu...
        </Text>
      </SafeAreaView>
    );
  }

  if (detail && !stage) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.header,
              borderBottomColor: theme.primary + "40",
            },
          ]}
        >
          <Image
            source={require("../../assets/logo_removed.png")}
            style={styles.logo}
          />
          <Text style={[styles.company, { color: theme.headerText }]}>
            Công Ty TNHH Thương Mại Và Dịch Vụ{"\n"}In & Bao Bì Đại Phúc Hải
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#fee2e2",
              padding: 16,
              borderRadius: 50,
              marginBottom: 16,
            }}
          >
            <Ionicons name="lock-closed" size={40} color="#dc2626" />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#111827",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Không có quyền truy cập
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#4b5563",
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 24,
            }}
          >
            Đơn hàng #{detail.order_code || id} không chứa công đoạn dành cho
            vai trò `{getRoleName(roleId) || "của bạn"}`.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
              elevation: 2,
            }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              Quay lại Trang chủ
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================
  // Helpers for modal rendering
  // ============================================================
  const activeMaterials =
    qrPrepare?.consumable_materials.filter(
      (m) => !shouldExcludeMaterial(m.material_name) && !m._isPaperInPrint,
    ) ?? [];

  const processIsRalo = isRaloStage(stage?.process_name);
  const processIsCut = isCutStage(stage?.process_name);

  const hasAnyError =
    !!quantityError ||
    Object.values(materialErrors).some((e) => e !== "") ||
    Object.values(refErrors).some((e) => e !== "");

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.header,
            borderBottomColor: theme.primary + "50",
          },
        ]}
      >
        <Image
          source={require("../../assets/logo_removed.png")}
          style={styles.logo}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.company, { color: theme.headerText }]}>
            Công Ty TNHH Thương Mại Và Dịch Vụ{"\n"}In & Bao Bì Đại Phúc Hải
          </Text>
        </View>
        <View style={[styles.roleIndicator, { backgroundColor: theme.badge }]}>
          <Text style={[styles.roleIndicatorText, { color: theme.badgeText }]}>
            {getRoleName(roleId)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: theme.light }]}
          >
            <Ionicons name="arrow-back" size={20} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Chi tiết lệnh sản xuất</Text>
        </View>

        <View style={styles.orderHeader}>
          <Text style={[styles.orderId, { color: theme.primary }]}>
            #{stage?.task_id ?? "--"}
          </Text>
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

        <View style={styles.metaBox}>
          <View style={styles.metaItem}>
            <Ionicons name="settings-outline" size={18} color={theme.primary} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.metaLabel}>Công đoạn</Text>
              <Text style={[styles.metaValue, { color: theme.primary }]}>
                {stage?.process_name ?? "--"}
              </Text>
            </View>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Feather name="calendar" size={18} color={theme.primary} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.metaLabel}>Hạn hoàn thành</Text>
              <Text style={styles.metaValue}>
                {formatDate(stage?.planned_end_time) || "--"}
              </Text>
            </View>
          </View>
        </View>

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

        <ProcessTimeline stages={filteredStages} theme={theme} />

        <View style={styles.infoBox}>
          {stage?.input_materials && stage.input_materials.length > 0 ? (
            <View style={{ marginBottom: 12, marginTop: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Feather name="download" size={18} color={theme.primary} />
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
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>Tên nguyên liệu</Text>
                <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>
                  Định mức
                </Text>
                <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>
                  Thực tế
                </Text>
                <Text style={[styles.th, { width: 44, textAlign: "center" }]}>
                  ĐVT
                </Text>
              </View>
              {stage.input_materials.map((mat, idx) => {
                const ref = findReferenceInputForMaterial(
                  mat,
                  qrPrepare?.reference_inputs,
                );
                const actualQty = getInputMaterialActualQty(mat, ref);

                return (
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
                      style={[
                        styles.td,
                        {
                          flex: 1,
                          textAlign: "center",
                          fontWeight: actualQty != null ? "600" : "400",
                          color: actualQty != null ? "#2563eb" : "#9ca3af",
                        },
                      ]}
                    >
                      {actualQty != null
                        ? actualQty.toLocaleString("vi-VN")
                        : "--"}
                    </Text>

                    <Text
                      style={[
                        styles.td,
                        { width: 44, textAlign: "center", color: "#6b7280" },
                      ]}
                    >
                      {mat.unit || "--"}
                    </Text>
                  </View>
                );
              })}
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
            label="Thành phẩm đầu ra ước tính từ đầu"
            note="*Số lượng ước tính giả sử đạt hiêu suất 100%" // 👈 thêm dòng này
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

        {isStageFinished ? (
          <View style={styles.buttonFinished}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.buttonFinishedText}>
              Đã hoàn thành công đoạn
            </Text>
          </View>
        ) : isStageReady ? (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.primary, shadowColor: theme.primary },
            ]}
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

      {/* =================== INPUT MODAL =================== */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: "92%" }]}>
            <View
              style={[styles.modalTitleRow, { borderLeftColor: theme.primary }]}
            >
              <Text style={styles.modalTitle}>
                Báo cáo công đoạn {stage?.process_name} - # {stage?.task_id}
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              scrollEnabled={!createQrLoading}
            >
              {/* ---- Bảng nguyên liệu đầu vào (GIỮ NGUYÊN) ---- */}
              {stage?.input_materials && stage.input_materials.length > 0 && (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionLabel}>Nguyên liệu đầu vào</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 2 }]}>
                      Tên nguyên liệu
                    </Text>
                    <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>
                      Định mức
                    </Text>
                    <Text
                      style={[styles.th, { flex: 1.5, textAlign: "center" }]}
                    >
                      TT CĐ trước
                    </Text>
                    <Text
                      style={[styles.th, { width: 60, textAlign: "center" }]}
                    >
                      Đơn vị
                    </Text>
                  </View>
                  {stage.input_materials.map((mat, idx) => {
                    const ref = findReferenceInputForMaterial(
                      mat,
                      qrPrepare?.reference_inputs,
                    );
                    const prevQty = getInputMaterialPrevStageQty(mat, ref);
                    return (
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
                          style={[
                            styles.td,
                            {
                              flex: 1.5,
                              textAlign: "center",
                              color: prevQty != null ? "#2563eb" : "#6b7280",
                              fontWeight: prevQty != null ? "600" : "400",
                            },
                          ]}
                        >
                          {prevQty != null
                            ? Number(prevQty).toLocaleString("vi-VN")
                            : "--"}
                        </Text>
                        <Text
                          style={[
                            styles.td,
                            { width: 30, textAlign: "center" },
                          ]}
                        >
                          {mat.unit || "--"}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {prepareLoading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.primary}
                  style={{ marginVertical: 16 }}
                />
              ) : (
                <>
                  {/* ---- Manual toggle (optional) ---- */}
                  {showManualToggle && (
                    <TouchableOpacity
                      style={[
                        modalStyles.toggleRow,
                        {
                          borderColor: theme.badge,
                          backgroundColor: theme.light,
                        },
                      ]}
                      onPress={() => {
                        if (forceSemiFinishedInput) return;
                        setUseManualInputToggle(!useManualInputToggle);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text
                          style={[
                            modalStyles.toggleTitle,
                            { color: theme.badgeText },
                          ]}
                        >
                          Nhập kho bán thành phẩm
                        </Text>
                      </View>
                      <View
                        style={[
                          modalStyles.toggleSwitch,
                          {
                            backgroundColor: effectiveManualToggle
                              ? theme.primary
                              : "#d1d5db",
                          },
                        ]}
                      >
                        <View
                          style={[
                            modalStyles.toggleKnob,
                            {
                              alignSelf: effectiveManualToggle
                                ? "flex-end"
                                : "flex-start",
                            },
                          ]}
                        />
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* ---- Forced manual banner ---- */}
                  {isManual && !showManualToggle && (
                    <View
                      style={[
                        modalStyles.infoBanner,
                        {
                          backgroundColor: theme.light,
                          borderColor: theme.badge,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          modalStyles.infoBannerText,
                          { color: theme.primary },
                        ]}
                      >
                        Nhập chi tiết vật tư, BTP đầu vào và đầu ra.
                      </Text>
                    </View>
                  )}

                  {/* ---- CONSUMABLE MATERIALS ---- */}
                  {activeMaterials.length > 0 && !processIsCut && (
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionLabel}>
                        {processIsRalo
                          ? "Nguyên vật liệu sử dụng"
                          : "Nhập kho nguyên vật liệu"}
                      </Text>

                      {processIsRalo
                        ? activeMaterials.map((mat) => (
                            <View
                              key={mat.material_id}
                              style={[
                                modalStyles.matCard,
                                {
                                  borderColor: materialErrors[mat.material_id]
                                    ? "#fca5a5"
                                    : !mat.is_mapped
                                      ? "#fbbf24"
                                      : "#e5e7eb",
                                },
                              ]}
                            >
                              <View style={modalStyles.matLabelRow}>
                                <Text style={modalStyles.matName}>
                                  {mat.material_name}
                                </Text>
                                <Text style={modalStyles.matHint}>
                                  Định mức: {mat.estimated_input_qty} {mat.unit}
                                </Text>
                              </View>
                              {!mat.is_mapped && (
                                <View style={modalStyles.warnRow}>
                                  <Ionicons
                                    name="warning-outline"
                                    size={13}
                                    color="#d97706"
                                  />
                                  <Text style={modalStyles.warnText}>
                                    NVL chưa được map — Vui lòng liên hệ admin
                                  </Text>
                                </View>
                              )}
                              <Text style={modalStyles.inputLabel}>
                                Lượng sử dụng
                              </Text>
                              <TextInput
                                style={[
                                  styles.input,
                                  {
                                    backgroundColor: "#fff",
                                    marginBottom: 0,
                                  },
                                  materialErrors[mat.material_id]
                                    ? styles.inputError
                                    : null,
                                ]}
                                keyboardType="numeric"
                                placeholder="Nhập lượng sử dụng"
                                placeholderTextColor="#9ca3af"
                                value={materialUsedQtys[mat.material_id] ?? ""}
                                onChangeText={(t) =>
                                  handleMaterialUsedChange(
                                    mat.material_id,
                                    mat.estimated_input_qty,
                                    t,
                                  )
                                }
                              />
                              {materialErrors[mat.material_id] ? (
                                <Text
                                  style={[styles.fieldError, { marginTop: 4 }]}
                                >
                                  {materialErrors[mat.material_id]}
                                </Text>
                              ) : null}
                            </View>
                          ))
                        : isManual
                          ? /* Manual mode: show used + left pair */
                            activeMaterials.map((mat) => (
                              <View
                                key={mat.material_id}
                                style={[
                                  modalStyles.matCard,
                                  {
                                    borderColor: materialErrors[mat.material_id]
                                      ? "#fca5a5"
                                      : !mat.is_mapped
                                        ? "#fbbf24"
                                        : "#e5e7eb",
                                  },
                                ]}
                              >
                                <View style={modalStyles.matLabelRow}>
                                  <Text style={modalStyles.matName}>
                                    {mat.material_name}
                                  </Text>
                                  <Text style={modalStyles.matHint}>
                                    Định mức: {mat.estimated_input_qty}{" "}
                                    {mat.unit}
                                  </Text>
                                </View>
                                {!mat.is_mapped && (
                                  <View style={modalStyles.warnRow}>
                                    <Ionicons
                                      name="warning-outline"
                                      size={13}
                                      color="#d97706"
                                    />
                                    <Text style={modalStyles.warnText}>
                                      NVL chưa được map — Vui lòng liên hệ admin
                                    </Text>
                                  </View>
                                )}
                                <View
                                  style={[
                                    modalStyles.infoBannerSmall,
                                    { backgroundColor: theme.light },
                                  ]}
                                >
                                  <Ionicons
                                    name="information-circle-outline"
                                    size={13}
                                    color={theme.primary}
                                  />
                                  <Text
                                    style={[
                                      modalStyles.infoBannerSmallText,
                                      { color: theme.primary },
                                    ]}
                                  >
                                    Đã dùng + Dư = định mức (
                                    {mat.estimated_input_qty} {mat.unit})
                                  </Text>
                                </View>
                                <View style={modalStyles.matInputRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={modalStyles.inputLabel}>
                                      Lượng đã dùng
                                    </Text>
                                    <TextInput
                                      style={[
                                        styles.input,
                                        {
                                          backgroundColor: "#fff",
                                          marginBottom: 0,
                                        },
                                        materialErrors[mat.material_id]
                                          ? styles.inputError
                                          : null,
                                      ]}
                                      keyboardType="numeric"
                                      placeholder="Nhập lượng dùng"
                                      placeholderTextColor="#9ca3af"
                                      value={
                                        materialUsedQtys[mat.material_id] ?? ""
                                      }
                                      onChangeText={(t) =>
                                        handleMaterialUsedChange(
                                          mat.material_id,
                                          mat.estimated_input_qty,
                                          t,
                                        )
                                      }
                                    />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={modalStyles.inputLabel}>
                                      Lượng dư hoàn kho
                                    </Text>
                                    <TextInput
                                      style={[
                                        styles.input,
                                        {
                                          backgroundColor: "#fff",
                                          marginBottom: 0,
                                        },
                                        materialErrors[mat.material_id]
                                          ? styles.inputError
                                          : null,
                                      ]}
                                      keyboardType="numeric"
                                      placeholder="Nhập lượng dư"
                                      placeholderTextColor="#9ca3af"
                                      value={
                                        materialLeftQtys[mat.material_id] ?? ""
                                      }
                                      onChangeText={(t) =>
                                        handleMaterialLeftChange(
                                          mat.material_id,
                                          mat.estimated_input_qty,
                                          t,
                                        )
                                      }
                                    />
                                  </View>
                                </View>
                                {/* Nhập kho badge */}
                                <View style={modalStyles.stockBadgeRow}>
                                  <Text style={modalStyles.inputLabel}>
                                    Nhập kho:
                                  </Text>
                                  <View
                                    style={[
                                      modalStyles.stockBadge,
                                      resolveIsStock(
                                        parseReportQty(
                                          materialLeftQtys[mat.material_id],
                                        ),
                                      )
                                        ? modalStyles.stockBadgeYes
                                        : modalStyles.stockBadgeNo,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        modalStyles.stockBadgeText,
                                        resolveIsStock(
                                          parseReportQty(
                                            materialLeftQtys[mat.material_id],
                                          ),
                                        )
                                          ? { color: "#065f46" }
                                          : { color: "#6b7280" },
                                      ]}
                                    >
                                      {resolveIsStock(
                                        parseReportQty(
                                          materialLeftQtys[mat.material_id],
                                        ),
                                      )
                                        ? "Có"
                                        : "Không"}
                                    </Text>
                                  </View>
                                </View>
                                {materialErrors[mat.material_id] ? (
                                  <Text
                                    style={[
                                      styles.fieldError,
                                      { marginTop: 4 },
                                    ]}
                                  >
                                    {materialErrors[mat.material_id]}
                                  </Text>
                                ) : null}
                              </View>
                            ))
                          : /* Estimate mode: only left qty */
                            activeMaterials.map((mat) => (
                              <View
                                key={mat.material_id}
                                style={styles.materialRow}
                              >
                                <View style={styles.materialLabelRow}>
                                  <Text style={styles.materialName}>
                                    {mat.material_name}
                                  </Text>
                                  <Text style={styles.materialHint}>
                                    Đã xuất: {mat.estimated_input_qty}{" "}
                                    {mat.unit}
                                  </Text>
                                </View>
                                {!mat.is_mapped && (
                                  <View style={modalStyles.warnRow}>
                                    <Ionicons
                                      name="warning-outline"
                                      size={13}
                                      color="#d97706"
                                    />
                                    <Text style={modalStyles.warnText}>
                                      NVL chưa được map — Vui lòng liên hệ admin
                                    </Text>
                                  </View>
                                )}
                                <View style={modalStyles.estimateRow}>
                                  <TextInput
                                    style={[
                                      styles.input,
                                      { flex: 1, textAlign: "right" },
                                      materialErrors[mat.material_id]
                                        ? styles.inputError
                                        : null,
                                    ]}
                                    keyboardType="numeric"
                                    placeholder="Lượng dư (mặc định: 0)"
                                    placeholderTextColor="#9ca3af"
                                    value={
                                      materialLeftQtys[mat.material_id] ?? ""
                                    }
                                    onChangeText={(t) =>
                                      handleMaterialLeftChange(
                                        mat.material_id,
                                        mat.estimated_input_qty,
                                        t,
                                      )
                                    }
                                  />
                                  <View
                                    style={[
                                      modalStyles.stockBadge,
                                      resolveIsStock(
                                        parseReportQty(
                                          materialLeftQtys[mat.material_id],
                                        ),
                                      )
                                        ? modalStyles.stockBadgeYes
                                        : modalStyles.stockBadgeNo,
                                      { marginLeft: 8, alignSelf: "center" },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        modalStyles.stockBadgeText,
                                        resolveIsStock(
                                          parseReportQty(
                                            materialLeftQtys[mat.material_id],
                                          ),
                                        )
                                          ? { color: "#065f46" }
                                          : { color: "#6b7280" },
                                      ]}
                                    >
                                      {resolveIsStock(
                                        parseReportQty(
                                          materialLeftQtys[mat.material_id],
                                        ),
                                      )
                                        ? "Nhập kho"
                                        : "Không nhập kho"}
                                    </Text>
                                  </View>
                                </View>
                                {materialErrors[mat.material_id] ? (
                                  <Text style={styles.fieldError}>
                                    {materialErrors[mat.material_id]}
                                  </Text>
                                ) : null}
                              </View>
                            ))}
                    </View>
                  )}

                  {/* ---- REFERENCE INPUTS (BTP) — only in manual mode ---- */}
                  {isManual &&
                    qrPrepare?.reference_inputs &&
                    qrPrepare.reference_inputs.length > 0 && (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionLabel}>
                          Nhập kho bán thành phẩm
                        </Text>
                        {qrPrepare.reference_inputs.map((ref) => (
                          <View
                            key={ref.input_code}
                            style={modalStyles.refCard}
                          >
                            <Text style={modalStyles.refName}>
                              {ref.input_name}
                            </Text>
                            <Text style={modalStyles.refHint}>
                              Ước tính: {ref.estimated_qty} {ref.unit}
                              {ref.actual_qty_prev_stage != null
                                ? `  •  TT CĐ trước: ${Number(ref.actual_qty_prev_stage).toLocaleString("vi-VN")} ${ref.unit}`
                                : ""}
                            </Text>

                            {ref.actual_qty_prev_stage != null && (
                              <View
                                style={[
                                  modalStyles.infoBannerSmall,
                                  {
                                    backgroundColor: "#eff6ff",
                                    marginBottom: 6,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name="information-circle-outline"
                                  size={13}
                                  color="#2563eb"
                                />
                                <Text
                                  style={[
                                    modalStyles.infoBannerSmallText,
                                    { color: "#2563eb" },
                                  ]}
                                >
                                  Lượng dư tối đa 15% TT CĐ trước (≤{" "}
                                  {Math.floor(
                                    ref.actual_qty_prev_stage * 0.15,
                                  ).toLocaleString("vi-VN")}{" "}
                                  {ref.unit})
                                </Text>
                              </View>
                            )}

                            <View style={modalStyles.matInputRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={modalStyles.inputLabel}>
                                  Lượng dư
                                </Text>
                                <TextInput
                                  style={[
                                    styles.input,
                                    {
                                      backgroundColor: "#fff",
                                      marginBottom: 0,
                                    },
                                    refErrors[ref.input_code]
                                      ? styles.inputError
                                      : null,
                                  ]}
                                  keyboardType="numeric"
                                  placeholder="0"
                                  placeholderTextColor="#9ca3af"
                                  value={refLeftQtys[ref.input_code] ?? ""}
                                  onChangeText={(t) =>
                                    handleRefLeftChange(ref, t)
                                  }
                                />
                                {refErrors[ref.input_code] ? (
                                  <Text
                                    style={[
                                      styles.fieldError,
                                      { marginTop: 2 },
                                    ]}
                                  >
                                    {refErrors[ref.input_code]}
                                  </Text>
                                ) : null}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={modalStyles.inputLabel}>
                                  Đã dùng
                                </Text>
                                <View
                                  style={[
                                    styles.input,
                                    {
                                      backgroundColor: "#f3f4f6",
                                      marginBottom: 0,
                                      justifyContent: "center",
                                    },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      color: "#374151",
                                      fontWeight: "600",
                                      textAlign: "right",
                                    }}
                                  >
                                    {refUsedQtys[ref.input_code] != null &&
                                    refUsedQtys[ref.input_code] !== ""
                                      ? Number(
                                          refUsedQtys[ref.input_code],
                                        ).toLocaleString("vi-VN")
                                      : "—"}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {/* Nhập kho badge */}
                            <View
                              style={[
                                modalStyles.stockBadgeRow,
                                { marginTop: 8 },
                              ]}
                            >
                              <Text style={modalStyles.inputLabel}>
                                Nhập kho:
                              </Text>
                              <View
                                style={[
                                  modalStyles.stockBadge,
                                  resolveIsStock(
                                    parseReportQty(refLeftQtys[ref.input_code]),
                                  )
                                    ? modalStyles.stockBadgeYes
                                    : modalStyles.stockBadgeNo,
                                ]}
                              >
                                <Text
                                  style={[
                                    modalStyles.stockBadgeText,
                                    resolveIsStock(
                                      parseReportQty(
                                        refLeftQtys[ref.input_code],
                                      ),
                                    )
                                      ? { color: "#065f46" }
                                      : { color: "#6b7280" },
                                  ]}
                                >
                                  {resolveIsStock(
                                    parseReportQty(refLeftQtys[ref.input_code]),
                                  )
                                    ? "Có"
                                    : "Không"}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                  {/* ---- QTY GOOD + QTY BAD ---- */}
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionLabel}>Sản lượng Báo cáo</Text>
                      <Text style={styles.unitText}>
                        ĐVT:{" "}
                        {qrPrepare?.qty_unit ?? stage?.output_product?.unit}
                      </Text>
                    </View>

                    {/* Qty good */}
                    <View>
                      <Text style={modalStyles.inputLabel}>Sản lượng đạt</Text>
                      <TextInput
                        style={[
                          styles.input,
                          quantityError ? styles.inputError : null,
                          {
                            backgroundColor: "#fff",
                            textAlign: "right",
                            marginBottom: 0,
                          },
                        ]}
                        keyboardType="numeric"
                        placeholder={`Mặc định: ${qrPrepare?.suggested_qty ?? stage?.output_product?.quantity ?? "--"}`}
                        placeholderTextColor="#9ca3af"
                        value={quantity}
                        onChangeText={handleQuantityChange}
                      />
                      {quantityError ? (
                        <Text style={[styles.fieldError, { marginTop: 4 }]}>
                          {quantityError}
                        </Text>
                      ) : null}
                    </View>

                    {/* Qty bad */}
                    {/* <View style={{ marginTop: 12 }}>
                      <Text style={modalStyles.inputLabel}>Số lượng hỏng / lỗi</Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: "#fff",
                            textAlign: "right",
                            marginBottom: 0,
                          },
                          (() => {
                            const bad = Number(qtyBad || 0);
                            const good = quantity ? Number(quantity) : (qrPrepare?.suggested_qty ?? 0);
                            return bad < 0 || bad > good ? styles.inputError : null;
                          })(),
                        ]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        value={qtyBad}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9]/g, "");
                          setQtyBad(cleaned === "" ? "0" : cleaned);
                        }}
                      />
                      {(() => {
                        const bad = Number(qtyBad || 0);
                        const good = quantity ? Number(quantity) : (qrPrepare?.suggested_qty ?? 0);
                        if (bad < 0)
                          return <Text style={[styles.fieldError, { marginTop: 4 }]}>Số lượng hỏng không được âm</Text>;
                        if (bad > good && good > 0)
                          return <Text style={[styles.fieldError, { marginTop: 4 }]}>Số lượng hỏng không được lớn hơn số lượng đạt</Text>;
                        return null;
                      })()}
                    </View> */}
                  </View>

                  {/* ---- IMAGES ---- */}
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionLabel}>
                      Ảnh báo cáo (tối đa 4)
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 10,
                      }}
                    >
                      Chụp ảnh sản phẩm / công đoạn để báo cáo
                    </Text>
                    <View style={imgStyles.btnRow}>
                      <TouchableOpacity
                        style={[
                          imgStyles.captureBtn,
                          { backgroundColor: theme.primary },
                        ]}
                        onPress={takePhoto}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="camera" size={20} color="#fff" />
                        <Text style={imgStyles.captureBtnText}>Chụp ảnh</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          imgStyles.captureBtn,
                          { backgroundColor: theme.primary + "cc" },
                        ]}
                        onPress={pickImage}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="images" size={20} color="#fff" />
                        <Text style={imgStyles.captureBtnText}>Thư viện</Text>
                      </TouchableOpacity>
                    </View>
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
                        style={{
                          fontSize: 11,
                          color:
                            capturedImages.length > 0 ? "#16a34a" : "#9ca3af",
                          marginTop: 4,
                        }}
                      >
                        {capturedImages.length}/4 ảnh đã chọn
                      </Text>
                    )}
                  </View>

                  {/* ---- REASON ---- */}
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
                style={[
                  styles.cancelBtn,
                  createQrLoading && styles.okBtnDisabled,
                ]}
                disabled={createQrLoading}
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
                  { backgroundColor: theme.primary },
                  (hasAnyError || prepareLoading || createQrLoading) &&
                    styles.okBtnDisabled,
                ]}
                disabled={hasAnyError || prepareLoading || createQrLoading}
                onPress={async () => {
                  const success = await createQr();
                  if (success) setModalVisible(false);
                }}
              >
                {createQrLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.okText}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>

            {createQrLoading && (
              <View style={styles.modalLoadingOverlay} pointerEvents="auto">
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.modalLoadingText}>Đang tạo QR...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* =================== QR MODAL =================== */}
      <Modal transparent visible={qrVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrBox}>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>
              QR Code {roleId ? `— ${getRoleName(roleId)}` : ""}
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: "center", paddingBottom: 8 }}
            >
              {qrData && (
                <>
                  <View
                    style={[styles.qrWrapper, { borderColor: theme.badge }]}
                  >
                    <QRCode
                      value={qrData.token}
                      size={200}
                      color={theme.primary}
                    />
                  </View>
                  <Text style={styles.qrQty}>
                    Số lượng: {qrData.qty_good_used}{" "}
                    {stage?.output_product.unit}
                  </Text>
                  <View
                    style={[styles.tokenBox, { backgroundColor: theme.light }]}
                  >
                    <Text style={styles.tokenLabel}>Mã xác nhận</Text>
                    <View style={styles.tokenRow}>
                      <Text
                        style={[styles.tokenValue, { color: theme.primary }]}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {qrData.token}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.copyBtn,
                          {
                            backgroundColor: theme.light,
                            borderColor: theme.badge,
                          },
                          tokenCopied && styles.copyBtnSuccess,
                        ]}
                        onPress={() => copyToken(qrData.token)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={tokenCopied ? "checkmark" : "copy-outline"}
                          size={16}
                          color={tokenCopied ? "#16a34a" : theme.primary}
                        />
                        <Text
                          style={[
                            styles.copyBtnText,
                            { color: theme.primary },
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

      {/* SUCCESS */}
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
              style={[styles.okBtn, { backgroundColor: theme.primary }]}
              onPress={() => setSuccessVisible(false)}
            >
              <Text style={[styles.okText, { textAlign: "center" }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ERROR */}
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
              style={[styles.okBtn, { backgroundColor: theme.primary }]}
              onPress={() => setErrorVisible(false)}
            >
              <Text style={[styles.okText, { textAlign: "center" }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* IMAGE PREVIEW */}
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

/* ---- InfoRow ---- */
function InfoRow({
  icon,
  label,
  value,
  valueStyle,
  noBorder,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueStyle?: object;
  noBorder?: boolean;
  note?: string;
}) {
  return (
    <View style={[infoRowStyles.row, noBorder && { borderBottomWidth: 0 }]}>
      <View style={infoRowStyles.icon}>{icon}</View>
      <View style={infoRowStyles.content}>
        {label ? <Text style={infoRowStyles.label}>{label}</Text> : null}
        {note ? ( // 👈 thêm note
          <Text style={infoRowStyles.note}>{note}</Text>
        ) : null}
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
  note: {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 2,
  },
});

/* ---- Modal-specific styles ---- */
const modalStyles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  toggleTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  toggleSubtitle: { fontSize: 11 },
  toggleSwitch: {
    width: 48,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    elevation: 2,
  },
  infoBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoBannerTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  infoBannerText: { fontSize: 11 },
  infoBannerSmall: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    gap: 4,
  },
  infoBannerSmallText: { fontSize: 11, flex: 1 },
  matCard: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  matLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  matName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  matHint: { fontSize: 11, color: "#4b5563", fontWeight: "500" },
  warnRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    marginBottom: 2,
    gap: 4,
  },
  warnText: { fontSize: 11, color: "#d97706", fontWeight: "600", flex: 1 },
  matInputRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  inputLabel: {
    fontSize: 11,
    color: "#4b5563",
    marginBottom: 4,
    fontWeight: "600",
  },
  estimateRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  stockBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stockBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  stockBadgeYes: { backgroundColor: "#d1fae5" },
  stockBadgeNo: { backgroundColor: "#f3f4f6" },
  stockBadgeText: { fontSize: 11, fontWeight: "700" },
  refCard: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  refName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  refHint: { fontSize: 11, color: "#6b7280", marginBottom: 6 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  logo: { width: 56, height: 38, resizeMode: "contain", marginRight: 10 },
  company: { flex: 1, fontSize: 12, lineHeight: 18 },
  roleIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleIndicatorText: { fontSize: 12, fontWeight: "700" },
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  pageTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  orderHeader: { alignItems: "center", paddingVertical: 12 },
  orderId: { fontSize: 26, fontWeight: "800", letterSpacing: 1 },
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
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
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
    overflow: "hidden",
  },
  modalLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.82)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    borderRadius: 16,
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  modalTitleRow: {
    borderLeftWidth: 4,
    borderRadius: 0,
    paddingLeft: 10,
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  sectionBlock: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  materialRow: { marginBottom: 8 },
  materialLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  materialName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  materialHint: { fontSize: 11, color: "#9ca3af" },
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
    marginVertical: 12,
  },
  qrQty: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  tokenBox: { borderRadius: 8, padding: 10, width: "100%", marginBottom: 12 },
  tokenLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 6,
    textAlign: "center",
  },
  tokenRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tokenValue: { flex: 1, fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyBtnSuccess: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  copyBtnText: { fontSize: 12, fontWeight: "600" },
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
  inputError: { borderColor: "#ef4444" },
  fieldError: { color: "#ef4444", fontSize: 12, marginBottom: 6 },
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
  okBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  okBtnDisabled: { opacity: 0.5 },
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
  unitText: { fontSize: 12, color: "#6b7280" },
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
  th: { fontSize: 12, fontWeight: "700", color: "#374151" },
  td: { fontSize: 13, color: "#111827" },
});

const imgStyles = StyleSheet.create({
  btnRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  captureBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  captureBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  thumbRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumbWrap: { position: "relative" },
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
