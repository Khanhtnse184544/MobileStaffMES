import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getConnection, startSignalR } from "../hooks/signalr";

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

export type Order = {
  order_id: number | null;
  prod_id: number;
  code: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  delivery_date: string;
  progress_percent: number;
  current_stage: string;
  status: string;
  production_status: string;
  stage_status: string;
  stage_statuses?: any[];
};

/* ================= CORE STATUS ================= */

const getDisplayStatus = (item: Order, userRole?: string) => {
  const { production_status } = item;
  const stage = userRole
    ? item.stage_statuses?.find(
        (s) => s.process_name?.toLowerCase() === userRole.toLowerCase(),
      )
    : null;
  const stage_status = stage ? stage.status : item.stage_status;

  // Ẩn hoàn toàn các đơn đã hoàn thành production
  if (
    production_status === "Finished" ||
    production_status === "Paid" ||
    production_status === "PendingPaid" ||
    production_status === "Delivery" ||
    production_status === "Completed" ||
    production_status === "Importing"
  )
    return "HIDDEN";

  // InProcessing + Finished stage → đã hoàn thành công đoạn
  if (production_status === "InProcessing" && stage_status === "Finished")
    return "DONE";

  // InProcessing + Ready → đang sản xuất
  if (production_status === "InProcessing" && stage_status === "Ready")
    return "PROCESSING";
  //Inprocessing + Unassigned
  if (production_status === "InProcessing" && stage_status === "Unassigned")
    return "WAITING_PREV";

  // Scheduled + Unassigned → chờ sản xuất (disabled)
  if (production_status === "Scheduled" && stage_status === "Unassigned")
    return "UNASSIGNED";

  // Scheduled (mặc định) → chờ bắt đầu
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

const getCompletionStatus = (item: Order, userRole?: string): CompletionStatus => {
  const stage = userRole
    ? item.stage_statuses?.find(
        (s) => s.process_name?.toLowerCase() === userRole.toLowerCase(),
      )
    : item.stage_statuses?.[0];

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
      return "#16a34a"; // xanh lá
    case "ON_TIME":
      return "#2563eb"; // xanh dương
    case "LATE":
      return "#dc2626"; // đỏ
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
  const [activeSegment, setActiveSegment] = useState<"processing" | "completed">("processing");

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

  /* ================= FILTER ================= */

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "ALL", label: "Tất cả" },
    { key: "SCHEDULED", label: "Chờ SX" },
    { key: "PROCESSING", label: "Đang SX" },
    { key: "DONE", label: "Hoàn thành" },
    { key: "OVERDUE", label: "Quá hạn" },
    { key: "URGENT", label: "Gấp" },
    { key: "UNASSIGNED", label: "Chờ công đoạn trước" },
  ];

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
      default:
        return "";
    }
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

      const res = await fetch(
        "https://mmes-sep490-84gr.onrender.com/api/Productions/get-all-production?page=1&pageSize=500",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      // remove duplicate prod_id
      const unique = Array.from(
        new Map(
          data.data.map((o: Order) => [o.prod_id || o.order_id, o]),
        ).values(),
      ) as Order[];

      setOrders(unique);
    } catch (err) {
      console.log("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= COUNT ================= */

  /* ================= FILTER + SEARCH + SORT ================= */

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => getDisplayStatus(o, role) !== "HIDDEN")
      .filter((o) => {
        // Filter by role: at least one stage in stage_statuses must match the worker's role process_name
        if (!role) return true;
        
        const hasRoleStage = o.stage_statuses?.some(
          (s) => s.process_name?.toLowerCase() === role.toLowerCase()
        );
        return hasRoleStage;
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
        return (
          o.prod_id.toString().includes(text)
        );
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
        return priorityOrder[getPriority(a, role)] - priorityOrder[getPriority(b, role)];
      });
  }, [orders, searchText, role, activeSegment]);

  /* ================= EFFECT ================= */

  useEffect(() => {
    const loadRole = async () => {
      const roleId = await SecureStore.getItemAsync("role_id");

      if (roleId) setRole(getRoleName(roleId));

      fetchOrders();
    };

    loadRole();

    startSignalR();

    const handleRealtime = (data: any) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === data.request_id || o.prod_id === data.request_id
            ? { ...o, status: data.new_status }
            : o,
        ),
      );
    };

    connection.on("request.changed", handleRealtime);

    return () => {
      connection.off("request.changed", handleRealtime);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders(); // ✅ reload mỗi lần quay lại màn
    }, []),
  );

  /* ================= UI ================= */

  const formatDate = (date?: string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("vi-VN").split("T")[0];
  };

  const renderItem = ({ item }: { item: Order }) => {
    const stage = item.stage_statuses?.find((s) => s.process_name?.toLowerCase() === role.toLowerCase()) || item.stage_statuses?.[0];
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
                : FILTER_COLOR[priority],
          },
          isDisabled && styles.disabledCard,
        ]}
        disabled={isDisabled}
        onPress={() =>
          router.push({
            pathname: "/order/[id]",
            params: {
              id: item.order_id === null ? item.prod_id : item.order_id,
              type: item.order_id === null ? "group" : "single",
            },
          })
        }
      >
        <View style={styles.headerRow}>
          {completionStatus !== "NONE" && (
            <Text
              style={{
                color: getCompletionColor(completionStatus),
                fontWeight: "bold",
                marginBottom: 6,
              }}
            >
              {getCompletionText(completionStatus)}
            </Text>
          )}
          <Text style={styles.orderId}>
            Lệnh: #{item.prod_id} {isDisabled && "🔒"}
          </Text>

          <Text
            style={[
              styles.priorityBadge,
              { backgroundColor: FILTER_COLOR[priority] },
            ]}
          >
            {getPriorityText(priority)}
          </Text>
        </View>

        <View style={styles.row}>
          <Feather name="settings" size={18} />
          <View style={styles.info}>
            <Text style={styles.label}>Sản phẩm</Text>
            <Text>
              {item.product_name} x {item.quantity}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <Ionicons name="checkmark-circle-outline" size={20} />
          <View style={styles.info}>
            <Text style={styles.label}>Trạng thái</Text>
            <Text
              style={{
                color: getStatusColor(item, role),
                fontWeight: "bold",
              }}
            >
              {getStatusText(item, role)}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <Ionicons name="time-outline" size={18} />
          <View style={styles.info}>
            <Text style={styles.label}>Kế hoạch</Text>
            <Text>
              {formatDate(stage?.planned_start_time)} →{" "}
              {formatDate(stage?.planned_end_time)}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <Feather name="calendar" size={18} />
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
      <View style={styles.header}>
        <Image
          source={require("../assets/logo_removed.png")}
          style={styles.logo}
        />
        <Text style={styles.company}>
          Công Ty TNHH Thương Mại Và Dịch Vụ{"\n"}In & Bao Bì Đại Phúc Hải
        </Text>
      </View>

      <Text style={styles.title}>Chuyên viên {role}</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} />
        <TextInput
          placeholder="Tìm mã lệnh"
          value={searchText}
          onChangeText={setSearchText}
          style={{ flex: 1, marginLeft: 8 }}
        />
      </View>

      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeSegment === "processing" && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveSegment("processing")}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === "processing" && styles.segmentTextActive,
            ]}
          >
            Đang sản xuất
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeSegment === "completed" && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveSegment("completed")}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === "completed" && styles.segmentTextActive,
            ]}
          >
            Đã hoàn thành
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={18} />
        <Text style={styles.infoText}>
          Có {filteredOrders.length} lệnh {role} {activeSegment === "processing" ? "cần sản xuất" : "đã hoàn thành"}
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

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.replace("/home")}
        >
          <Ionicons name="calendar-outline" size={32} color="#2563eb" />
          <Text style={styles.activeTab}>Sản xuất</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => router.push("/profile")}
        >
          <Ionicons name="person-outline" size={32} />
          <Text>Hồ sơ</Text>
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
    borderColor: "#ccc",
  },

  logo: {
    width: 60,
    height: 40,
    resizeMode: "contain",
    marginRight: 10,
  },

  company: { flex: 1, fontSize: 14 },

  title: {
    textAlign: "center",
    fontSize: 22,
    marginVertical: 10,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 20,
  },

  infoText: {
    marginLeft: 8,
    color: "#2563eb",
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    borderLeftWidth: 6,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  orderId: {
    color: "#2563eb",
    fontWeight: "bold",
    marginBottom: 10,
  },

  priorityBadge: {
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
  },

  row: {
    flexDirection: "row",
    marginBottom: 10,
  },

  info: {
    marginLeft: 10,
  },

  label: {
    color: "#777",
    fontSize: 12,
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
    backgroundColor: "#eab308",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  tab: { alignItems: "center" },

  activeTab: { color: "#2563eb" },

  disabledCard: { opacity: 0.5 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  filterContainer: {
    marginTop: 10,
    paddingLeft: 10,
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },

  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
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

  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#71717a",
  },

  segmentTextActive: {
    color: "#2563eb",
    fontWeight: "bold",
  },
});
