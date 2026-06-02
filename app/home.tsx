import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "../constants/api";
import {
  getConnection,
  joinMachineGroups,
  startSignalR,
} from "../hooks/signalr";

const connection = getConnection();
const { width } = Dimensions.get("window");

/* ================= TYPE ================= */

type FilterKey =
  | "ALL"
  | "SCHEDULED"
  | "PROCESSING"
  | "DONE"
  | "OVERDUE"
  | "URGENT"
  | "NORMAL"
  | "UNASSIGNED";

type CompletionStatus = "EARLY" | "ON_TIME" | "LATE" | "NONE";

type Notification = {
  id: number;
  content: string;
  is_check: boolean;
  order_request_id: number;
  role_id: number;
  status: boolean;
  time: string;
  user_id: number;
};

export type Order = {
  order_id: number | null;
  prod_id: number;
  production_id: number;

  code: string;
  production_code: string;

  customer_name: string;
  product_name: string;

  quantity: number;
  nvl_qty: number;

  delivery_date: string;
  planned_start_date: string | null;
  actual_start_date: string | null;

  progress_percent: number;

  current_stage: string;

  status: string;
  order_status: string;
  production_status: string;
  stage_status: string;

  production_method: string;
  prod_kind: string;

  is_full_process: boolean;
  is_group_production: boolean;
  is_split_production: boolean;
  is_production_ready: boolean;
  is_auto_production_approval: boolean;
  can_start: boolean;

  can_start_message: string;

  gm_note: string | null;
  mgr_note: string | null;

  sub_product_id: number | null;
  sub_product_used_qty: number;

  group_status: string | null;
  group_process_codes: string[] | null;
  group_total_qty: number | null;

  production_approval_flow: string;
  production_approval_label: string;

  start_date: string | null;
  end_date: string | null;

  created_at: string;

  stages: string[];

  stage_statuses?: any[];
};

/* ================= ROLE COLOR THEME ================= */

type RoleTheme = {
  primary: string; // main accent (buttons, borders, icons)
  light: string; // light background tint
  badge: string; // badge background
  badgeText: string; // badge text
  header: string; // header background
  headerText: string; // header text/icon
  bottomBar: string; // bottom tab bar
};

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

const getAllowedProcesses = (role: string): string[] => {
  const r = role.toLowerCase();
  if (r === "ralo") return ["Ralo"];
  if (r === "cắt") return ["Cắt"];
  if (r === "in") return ["In"];
  if (r === "phủ") return ["Phủ"];
  if (r === "cán") return ["Cán"];
  if (r === "bồi") return ["Bồi"];
  if (r === "bế") return ["Bế"];
  if (r === "dứt") return ["Dứt"];
  if (r === "dán") return ["Dán"];

  if (r === "phong_ban_1" || r === "19") return ["Ralo", "Cắt", "In"];
  if (r === "phong_ban_2" || r === "20") return ["Phủ", "Cán", "Bồi"];
  if (r === "phong_ban_3" || r === "21") return ["Bế", "Dứt", "Dán"];

  return [];
};

const getActiveStage = (item: Order, userRole?: string) => {
  if (!userRole || !item.stage_statuses) return null;
  const allowed = getAllowedProcesses(userRole);
  if (allowed.length === 0) return null;

  const stages = item.stage_statuses.filter((s) =>
    allowed.some((a) => a.toLowerCase() === s.process_name?.toLowerCase()),
  );

  if (stages.length === 0) return null;

  const active = stages.find((s) => s.status !== "Finished");
  return active || stages[stages.length - 1];
};

/* ================= CORE STATUS ================= */

const getDisplayStatus = (item: Order, userRole?: string) => {
  const { production_status } = item;
  const stage = getActiveStage(item, userRole);
  const stage_status = stage ? stage.status : item.stage_status;

  if (
    production_status === "Finished" ||
    production_status === "Paid" ||
    production_status === "PendingPaid" ||
    production_status === "Pending" ||
    production_status === "Delivery" ||
    production_status === "Completed" ||
    production_status === "Importing"
  )
    return "HIDDEN";

  if (production_status === "InProcessing" && stage_status === "Finished")
    return "DONE";

  if (production_status === "InProcessing" && stage_status === "Ready")
    return "PROCESSING";

  if (production_status === "InProcessing" && stage_status === "Unassigned")
    return "WAITING_PREV";

  if (production_status === "Scheduled" && stage_status === "Unassigned")
    return "UNASSIGNED";

  if (production_status === "Scheduled") return "SCHEDULED";

  return "UNKNOWN";
};

const getStatusText = (item: Order, userRole?: string) => {
  const display = getDisplayStatus(item, userRole);

  switch (display) {
    case "PROCESSING":
      return "Đang sản xuất";
    case "UNASSIGNED":
      return "Chờ sản xuất";
    case "WAITING_PREV":
      return "Chờ bắt đầu sản xuất";
    case "SCHEDULED":
      return "Chờ bắt đầu sản xuất";
    case "DONE":
      return "Đã hoàn thành công đoạn";
    default:
      return item.status;
  }
};

const getStatusColor = (item: Order, userRole?: string) => {
  const display = getDisplayStatus(item, userRole);

  switch (display) {
    case "PROCESSING":
      return "#2563eb";
    case "UNASSIGNED":
      return "#9ca3af";
    case "WAITING_PREV":
      return "#9ca3af";
    case "SCHEDULED":
      return "#eab308";
    case "DONE":
      return "#16a34a";
    default:
      return "#000";
  }
};

/* ================= COMPLETION ================= */

const getCompletionStatus = (
  item: Order,
  userRole?: string,
): CompletionStatus => {
  const stage = getActiveStage(item, userRole) || item.stage_statuses?.[0];

  if (!stage?.end_time) return "NONE";

  const end = new Date(stage.end_time);
  const deadline = new Date(item.delivery_date);

  if (end < deadline) return "EARLY";
  if (end.getTime() === deadline.getTime()) return "ON_TIME";

  return "LATE";
};

const getCompletionColor = (status: CompletionStatus) => {
  switch (status) {
    case "EARLY":
      return "#16a34a";
    case "ON_TIME":
      return "#2563eb";
    case "LATE":
      return "#dc2626";
    default:
      return "#6b7280";
  }
};

const getCompletionText = (status: CompletionStatus) => {
  switch (status) {
    case "EARLY":
      return "Hoàn thành sớm";
    case "ON_TIME":
      return "Đúng hạn";
    case "LATE":
      return "Hoàn thành trễ";
    default:
      return "";
  }
};

/* ================= COMPONENT ================= */

export default function Home() {
  const [role, setRole] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeSegment, setActiveSegment] = useState<
    "processing" | "completed"
  >("processing");
  const [selectedProcess, setSelectedProcess] = useState<string>("ALL");
  const allowedProcesses = useMemo(() => getAllowedProcesses(role), [role]);

  /* ================= NOTIFICATION STATE ================= */
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifList, setShowNotifList] = useState(false);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);

  const slideAnim = useRef(new Animated.Value(-150)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = getRoleTheme(role);

  /* ================= COLOR ================= */

  const FILTER_COLOR: Record<FilterKey, string> = {
    ALL: "#6b7280",
    SCHEDULED: "#eab308",
    PROCESSING: "#2563eb",
    DONE: "#16a34a",
    OVERDUE: "#dc2626",
    URGENT: "#f97316",
    NORMAL: "#16a34a",
    UNASSIGNED: "#9ca3af",
  };

  /* ================= ROLE ================= */

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

  const getRoleDisplayName = (r: string) => {
    if (r === "phong_ban_1") return "Phòng ban (Ralo, Cắt, In)";
    if (r === "phong_ban_2") return "Phòng ban (Phủ, Cán, Bồi)";
    if (r === "phong_ban_3") return "Phòng ban (Bế, Dứt, Dán)";
    if (r === "Ralo") return "Chuyên viên Ralo";
    if (r === "Cắt") return "Chuyên viên Cắt";
    if (r === "In") return "Chuyên viên In";
    if (r === "Phủ") return "Chuyên viên Phủ";
    if (r === "Cán") return "Chuyên viên Cán";
    if (r === "Bồi") return "Chuyên viên Bồi";
    if (r === "Bế") return "Chuyên viên Bế";
    if (r === "Dứt") return "Chuyên viên Dứt";
    if (r === "Dán") return "Chuyên viên Dán";
    return r;
  };

  /* ================= PRIORITY ================= */

  const getPriority = (item: Order, userRole?: string): FilterKey => {
    const now = new Date();
    const deadline = new Date(item.delivery_date);
    const display = getDisplayStatus(item, userRole);

    if (display === "UNASSIGNED") return "UNASSIGNED";
    if (deadline < now && display !== "DONE") return "OVERDUE";

    const diff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 2 && display !== "DONE") return "URGENT";

    return "NORMAL";
  };

  const getPriorityText = (priority: FilterKey) => {
    switch (priority) {
      case "OVERDUE":
        return "Quá hạn";
      case "URGENT":
        return "Gấp";
      case "NORMAL":
        return "Bình thường";
      case "UNASSIGNED":
        return "Chưa bắt đầu sản xuất";
      default:
        return "";
    }
  };

  /* ================= API ================= */

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("jwt");
      if (!token) {
        console.log("Fetch error: chưa có token, vui lòng đăng nhập lại");
        return;
      }
      const res = await fetch(
        `${API_BASE_URL}/api/Productions/get-all-production?page=1&pageSize=500`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const text = await res.text();
      if (!res.ok) {
        console.log(`Fetch error: HTTP ${res.status}`, text || "(empty body)");
        return;
      }
      if (!text) {
        console.log("Fetch error: response rỗng");
        return;
      }
      const data = JSON.parse(text);
      const unique = Array.from(
        new Map(
          (data.data ?? []).map((o: Order) => [o.prod_id || o.order_id, o]),
        ).values(),
      ) as Order[];
      setOrders(unique);

      // Fetch DB notifications using the staff-get-noti API
      try {
        const notifRes = await fetch(
          `${API_BASE_URL}/api/Notifications/staff-get-noti?role=${role}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (notifRes.ok) {
          const notifText = await notifRes.text();
          if (notifText) {
            const notifData = JSON.parse(notifText);
            setNotifications(
              Array.isArray(notifData) ? notifData : (notifData.data ?? []),
            );
          }
        }
      } catch (e) {
        console.log("Fetch notifications failed:", e);
      }
    } catch (err) {
      console.log("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTER + SEARCH + SORT ================= */

  const filteredOrders = useMemo(() => {
    return orders
      .filter(
        (o) =>
          getDisplayStatus(o, role) !== "HIDDEN" &&
          o.production_approval_flow !== "WAITING_MANAGER" &&
          o.production_status !== "Pending",
      )
      .filter((o) => {
        if (!role) return true;
        const allowed = getAllowedProcesses(role);
        const hasRoleStage = o.stage_statuses?.some((s) =>
          allowed.some(
            (a) => a.toLowerCase() === s.process_name?.toLowerCase(),
          ),
        );
        return hasRoleStage;
      })
      .filter((o) => {
        if (selectedProcess === "ALL") return true;
        const activeStage = getActiveStage(o, role);
        return (
          activeStage?.process_name?.toLowerCase() ===
          selectedProcess.toLowerCase()
        );
      })
      .filter((o) => {
        const display = getDisplayStatus(o, role);
        if (activeSegment === "completed") {
          return display === "DONE";
        } else {
          return display !== "DONE";
        }
      })
      .filter((o) => {
        if (!searchText) return true;
        const text = searchText.toLowerCase();
        return o.prod_id.toString().includes(text);
      })
      .sort((a, b) => {
        const priorityOrder: Record<FilterKey, number> = {
          OVERDUE: 1,
          URGENT: 2,
          NORMAL: 3,
          UNASSIGNED: 4,
          ALL: 5,
          SCHEDULED: 6,
          PROCESSING: 7,
          DONE: 8,
        };
        return (
          priorityOrder[getPriority(a, role)] -
          priorityOrder[getPriority(b, role)]
        );
      });
  }, [orders, searchText, role, activeSegment, selectedProcess]);

  useEffect(() => {
    setSelectedProcess("ALL");
  }, [role]);

  /* ================= NOTIFICATION HELPERS ================= */

  const showNotification = (notif: Notification) => {
    setNotifications((prev) => {
      // Avoid duplicate IDs
      if (prev.some((n) => n.id === notif.id)) return prev;
      return [notif, ...prev];
    });
    setActiveToast(notif);

    // Animate in
    slideAnim.setValue(-150);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after 8s
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => dismissNotification(), 8000);
  };

  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveToast(null);
    });
  };

  const handleNotificationPress = async (notif: Notification) => {
    dismissNotification();
    setShowNotifList(false);

    // Mark as checked in local state
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_check: true } : n)),
    );

    // Call API to mark as check/read
    try {
      const token = await SecureStore.getItemAsync("jwt");
      await fetch(`${API_BASE_URL}/api/Notifications/check-read/${notif.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.log("Failed to mark notification read:", e);
    }

    router.push({
      pathname: "/order/[id]",
      params: { id: notif.order_request_id, type: "single" },
    });
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_check: true })));
    try {
      const token = await SecureStore.getItemAsync("jwt");
      await fetch(`${API_BASE_URL}/api/Notifications/check-read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.log("Failed to mark all as read:", e);
    }
  };

  /* ================= EFFECT ================= */

  useEffect(() => {
    const loadRole = async () => {
      const roleId = await SecureStore.getItemAsync("role_id");
      if (roleId) {
        const roleName = getRoleName(roleId);
        setRole(roleName);

        // Join machine group sau khi SignalR connected
        await startSignalR();
        await joinMachineGroups(roleName);
      }
      fetchOrders();
    };

    loadRole();

    const handleRealtime = (data: any) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === data.request_id || o.prod_id === data.request_id
            ? { ...o, status: data.new_status }
            : o,
        ),
      );
    };

    /* Lắng nghe "next task" event từ BE */
    const handleNextTask = (data: any) => {
      console.log("Received next task notification:", data);

      // Parse prod_id và task_id từ message
      const match = data.message?.match(/(\d+)\s*-\s*(\d+)/);
      const prod_id = match ? parseInt(match[1]) : 0;

      // Map to db notification schema
      const notif: Notification = {
        id: Date.now(),
        content: data.message || "Có lệnh sản xuất mới sẵn sàng",
        is_check: false,
        order_request_id: prod_id,
        role_id: 0,
        status: true,
        time: new Date().toISOString(),
        user_id: 0,
      };

      showNotification(notif);
    };

    connection.on("request.changed", handleRealtime);
    connection.on("next task", handleNextTask);
    return () => {
      connection.off("request.changed", handleRealtime);
      connection.off("next task", handleNextTask);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, []),
  );

  /* ================= UI ================= */

  const formatDate = (date?: string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("vi-VN").split("T")[0];
  };

  const renderItem = ({ item }: { item: Order }) => {
    const stage = getActiveStage(item, role) || item.stage_statuses?.[0];
    const priority = getPriority(item, role);
    const display = getDisplayStatus(item, role);
    const isDisabled = display === "SCHEDULED";
    const completionStatus = getCompletionStatus(item, role);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            borderLeftColor:
              completionStatus !== "NONE"
                ? getCompletionColor(completionStatus)
                : theme.primary,
          },
          isDisabled && styles.disabledCard,
        ]}
        disabled={isDisabled}
        onPress={() =>
          router.push({
            pathname: "/order/[id]",
            params: {
              id: item.prod_id,
              type: item.order_id === null ? "group" : "single",
            },
          })
        }
      >
        <View style={styles.headerContainer}>
          <Text style={[styles.orderId, { color: theme.primary }]}>
            Lệnh: #{item.prod_id} - {stage?.process_name || "--"} - #
            {stage?.task_id}
            {isDisabled && " 🔒"}
          </Text>

          <View style={styles.badgeRow}>
            {/* {completionStatus !== "NONE" && (
              <Text
                style={{
                  color: getCompletionColor(completionStatus),
                  fontWeight: "bold",
                }}
              >
                {getCompletionText(completionStatus)}
              </Text>
            )} */}

            <Text
              style={[
                styles.priorityBadge,
                { backgroundColor: FILTER_COLOR[priority] },
              ]}
            >
              {getPriorityText(priority)}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <Feather name="settings" size={18} color={theme.primary} />
          <View style={styles.info}>
            <Text style={styles.label}>Sản phẩm</Text>
            <Text>
              {item.product_name} x {item.quantity}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={theme.primary}
          />
          <View style={styles.info}>
            <Text style={styles.label}>Trạng thái</Text>
            <Text
              style={{ color: getStatusColor(item, role), fontWeight: "bold" }}
            >
              {getStatusText(item, role)}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <Ionicons name="time-outline" size={18} color={theme.primary} />
          <View style={styles.info}>
            <Text style={styles.label}>Kế hoạch</Text>
            <Text>
              {formatDate(stage?.planned_start_time)} →{" "}
              {formatDate(stage?.planned_end_time)}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <Feather name="calendar" size={18} color={theme.primary} />
          <View style={styles.info}>
            <Text style={styles.label}>Deadline</Text>
            <Text>{formatDate(item.delivery_date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ===== NOTIFICATION TOAST (REALTIME BANNER) ===== */}
      {activeToast && (
        <Animated.View
          style={[
            styles.notifContainer,
            {
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.notifCard, { borderLeftColor: theme.primary }]}
            onPress={() => handleNotificationPress(activeToast)}
          >
            <View style={styles.notifHeader}>
              <View
                style={[styles.notifIconWrap, { backgroundColor: theme.light }]}
              >
                <Ionicons
                  name="notifications"
                  size={20}
                  color={theme.primary}
                />
              </View>
              <View style={styles.notifTitleWrap}>
                <Text style={[styles.notifTitle, { color: theme.primary }]}>
                  🔔 Thông báo sản xuất mới
                </Text>
              </View>
              <TouchableOpacity
                onPress={dismissNotification}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <Text style={styles.notifMessage} numberOfLines={2}>
              {activeToast.content}
            </Text>
            <View style={styles.notifFooter}>
              <Text style={[styles.notifAction, { color: theme.primary }]}>
                Nhấn để xem chi tiết →
              </Text>
              <Text style={styles.notifTime}>
                {new Date(activeToast.time).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ===== NOTIFICATION LIST OVERLAY / SCREEN MODAL ===== */}
      {showNotifList && (
        <View style={styles.notifListOverlay}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.notifListHeader}>
              <TouchableOpacity onPress={() => setShowNotifList(false)}>
                <Ionicons name="arrow-back" size={24} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.notifListTitle}>Thông báo công việc</Text>
              <TouchableOpacity onPress={handleMarkAllRead}>
                <Text
                  style={[styles.notifMarkAllBtn, { color: theme.primary }]}
                >
                  Đọc tất cả
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={notifications}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
              ListEmptyComponent={
                <View style={styles.emptyNotifBox}>
                  <View
                    style={[
                      styles.emptyNotifIconWrap,
                      { backgroundColor: theme.light },
                    ]}
                  >
                    <Ionicons
                      name="notifications-off"
                      size={48}
                      color={theme.primary}
                    />
                  </View>
                  <Text style={styles.emptyNotifText}>
                    Chưa có thông báo nào dành cho bạn
                  </Text>
                  <Text style={styles.emptyNotifSubtext}>
                    Các thông báo về lệnh sản xuất và công việc sẽ xuất hiện tại
                    đây.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.emptyCloseBtn,
                      { backgroundColor: theme.primary },
                    ]}
                    onPress={() => setShowNotifList(false)}
                  >
                    <Text style={styles.emptyCloseBtnText}>
                      Quay lại trang chủ
                    </Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.notifListItemCard,
                    !item.is_check && styles.notifListItemUnread,
                  ]}
                  onPress={() => handleNotificationPress(item)}
                >
                  <View
                    style={[
                      styles.notifDot,
                      {
                        backgroundColor: item.is_check
                          ? "transparent"
                          : theme.primary,
                      },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.notifListItemText,
                        !item.is_check && styles.notifListItemTextUnread,
                      ]}
                    >
                      {item.content}
                    </Text>
                    <Text style={styles.notifListItemTime}>
                      {new Date(item.time).toLocaleString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </View>
      )}

      {/* HEADER — màu theo role */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.header,
            borderBottomColor: theme.primary + "40",
            justifyContent: "space-between",
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Image
            source={require("../assets/logo_removed.png")}
            style={styles.logo}
          />
          <Text
            style={[styles.company, { color: theme.headerText }]}
            numberOfLines={2}
          >
            Công Ty TNHH Thương Mại Và Dịch Vụ In & Bao Bì Đại Phúc Hải
          </Text>
        </View>

        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => setShowNotifList(true)}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={theme.primary}
          />
          {notifications.filter((n) => !n.is_check).length > 0 && (
            <View style={[styles.bellBadge, { backgroundColor: "#ef4444" }]}>
              <Text style={styles.bellBadgeText}>
                {notifications.filter((n) => !n.is_check).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ROLE BADGE */}
      <View style={styles.titleRow}>
        <View style={[styles.roleBadge, { backgroundColor: theme.badge }]}>
          <Text style={[styles.roleIcon, { color: theme.primary }]}>⚙</Text>
          <Text style={[styles.roleText, { color: theme.badgeText }]}>
            {getRoleDisplayName(role)}
          </Text>
        </View>
      </View>

      <View style={[styles.searchBox, { borderColor: theme.primary + "50" }]}>
        <Ionicons name="search-outline" size={18} color={theme.primary} />
        <TextInput
          placeholder="Tìm mã lệnh"
          value={searchText}
          onChangeText={setSearchText}
          style={{ flex: 1, marginLeft: 8 }}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* SEGMENT */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeSegment === "processing" && [
              styles.segmentButtonActive,
              { borderBottomColor: theme.primary, borderBottomWidth: 2 },
            ],
          ]}
          onPress={() => setActiveSegment("processing")}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === "processing" && [
                styles.segmentTextActive,
                { color: theme.primary },
              ],
            ]}
          >
            Đang sản xuất
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeSegment === "completed" && [
              styles.segmentButtonActive,
              { borderBottomColor: theme.primary, borderBottomWidth: 2 },
            ],
          ]}
          onPress={() => setActiveSegment("completed")}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === "completed" && [
                styles.segmentTextActive,
                { color: theme.primary },
              ],
            ]}
          >
            Đã hoàn thành
          </Text>
        </TouchableOpacity>
      </View>

      {/* PROCESS TABS FOR DEPARTMENTS */}
      {allowedProcesses.length > 1 && (
        <View style={styles.processTabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.processTabsScroll}
          >
            <TouchableOpacity
              style={[
                styles.processTabButton,
                selectedProcess === "ALL"
                  ? { backgroundColor: theme.primary }
                  : { backgroundColor: "#e4e4e7" },
              ]}
              onPress={() => setSelectedProcess("ALL")}
            >
              <Text
                style={[
                  styles.processTabText,
                  selectedProcess === "ALL"
                    ? { color: "#fff", fontWeight: "700" }
                    : { color: "#4b5563" },
                ]}
              >
                Tất cả
              </Text>
            </TouchableOpacity>
            {allowedProcesses.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.processTabButton,
                  selectedProcess === p
                    ? { backgroundColor: theme.primary }
                    : { backgroundColor: "#e4e4e7" },
                ]}
                onPress={() => setSelectedProcess(p)}
              >
                <Text
                  style={[
                    styles.processTabText,
                    selectedProcess === p
                      ? { color: "#fff", fontWeight: "700" }
                      : { color: "#4b5563" },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={18} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.primary }]}>
          Có {filteredOrders.length} lệnh{" "}
          {selectedProcess === "ALL"
            ? getRoleDisplayName(role)
            : `công đoạn ${selectedProcess}`}{" "}
          {activeSegment === "processing" ? "cần sản xuất" : "đã hoàn thành"}
        </Text>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item, index) =>
          `${item.prod_id || item.order_id}-${index}`
        }
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* BOTTOM BAR — màu theo role */}
      <View style={[styles.bottomBar, { backgroundColor: theme.bottomBar }]}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.replace("/home")}
        >
          <Ionicons name="calendar-outline" size={32} color="#fff" />
          <Text style={styles.activeTab}>Sản xuất</Text>
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
          <Ionicons name="person-outline" size={32} color="#ffffffcc" />
          <Text style={{ color: "#ffffffcc" }}>Hồ sơ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLE ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
  },

  logo: { width: 60, height: 40, resizeMode: "contain", marginRight: 10 },
  company: { flex: 1, fontSize: 14 },

  titleRow: {
    alignItems: "center",
    paddingVertical: 10,
  },

  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },

  roleIcon: { fontSize: 16 },

  roleText: {
    fontSize: 16,
    fontWeight: "700",
  },

  infoRow: { flexDirection: "row", alignItems: "center", margin: 20 },
  infoText: { marginLeft: 8 },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    borderLeftWidth: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  orderId: { fontWeight: "bold", marginBottom: 10 },

  priorityBadge: {
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
  },

  row: { flexDirection: "row", marginBottom: 10 },
  info: { marginLeft: 10 },
  label: { color: "#777", fontSize: 12 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  tab: { alignItems: "center" },
  activeTab: { color: "#fff", fontWeight: "600" },
  disabledCard: { opacity: 0.5 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    height: 40,
    borderWidth: 1.5,
  },

  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#e4e4e7",
    borderRadius: 8,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 15,
  },

  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },

  segmentButtonActive: {
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
  },

  segmentText: { fontSize: 14, fontWeight: "500", color: "#71717a" },
  segmentTextActive: { fontWeight: "bold" },

  processTabsContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
  },
  processTabsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  processTabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e4e4e7",
    minWidth: 70,
    alignItems: "center",
  },
  processTabText: {
    fontSize: 13,
    fontWeight: "500",
  },

  /* ===== NOTIFICATION STYLES ===== */
  notifContainer: {
    position: "absolute",
    top: 50,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 20,
  },
  notifCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  notifTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  notifCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  notifCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  notifMessage: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 8,
    paddingLeft: 46,
  },
  notifFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 46,
  },
  notifAction: {
    fontSize: 13,
    fontWeight: "600",
  },
  notifTime: {
    fontSize: 11,
    color: "#9ca3af",
  },
  bellButton: {
    padding: 8,
    position: "relative",
    marginLeft: 8,
  },
  bellBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  headerContainer: {
    marginBottom: 10,
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  notifListOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f3f4f6",
    zIndex: 99999,
  },
  notifListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  notifListTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  notifMarkAllBtn: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyNotifBox: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyNotifIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyNotifText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyNotifSubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyCloseBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyCloseBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  notifListItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  notifListItemUnread: {
    backgroundColor: "#f9fafb",
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  notifListItemText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 4,
  },
  notifListItemTextUnread: {
    fontWeight: "600",
    color: "#1f2937",
  },
  notifListItemTime: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
