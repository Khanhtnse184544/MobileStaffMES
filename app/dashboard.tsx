import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

/* ================= TYPES ================= */

type Task = {
  task_id: number;
  prod_id: number;
  name: string;
  seq_num: number;
  status: string;
  machine: string;
  start_time: string | null;
  end_time: string | null;
  planned_start_time: string | null;
  planned_end_time: string | null;
  process_id: number;
  reason: string | null;
  input_mode: string;
  process: any;
  prod: any;
  is_taken_sub_product: boolean;
  task_logs: any[];
};

/* ================= ROLE THEME ================= */

type RoleTheme = {
  primary: string;
  light: string;
  badge: string;
  badgeText: string;
  header: string;
  headerText: string;
  bottomBar: string;
  borderLight: string;
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
    borderLight: "#CECBF6",
  },
  Cắt: {
    primary: "#993C1D",
    light: "#FAECE7",
    badge: "#F5C4B3",
    badgeText: "#712B13",
    header: "#FAECE7",
    headerText: "#993C1D",
    bottomBar: "#993C1D",
    borderLight: "#F5C4B3",
  },
  In: {
    primary: "#185FA5",
    light: "#E6F1FB",
    badge: "#B5D4F4",
    badgeText: "#0C447C",
    header: "#E6F1FB",
    headerText: "#185FA5",
    bottomBar: "#185FA5",
    borderLight: "#B5D4F4",
  },
  Phủ: {
    primary: "#3B6D11",
    light: "#EAF3DE",
    badge: "#C0DD97",
    badgeText: "#27500A",
    header: "#EAF3DE",
    headerText: "#3B6D11",
    bottomBar: "#3B6D11",
    borderLight: "#C0DD97",
  },
  Cán: {
    primary: "#854F0B",
    light: "#FAEEDA",
    badge: "#FAC775",
    badgeText: "#633806",
    header: "#FAEEDA",
    headerText: "#854F0B",
    bottomBar: "#854F0B",
    borderLight: "#FAC775",
  },
  Bồi: {
    primary: "#0F6E56",
    light: "#E1F5EE",
    badge: "#9FE1CB",
    badgeText: "#085041",
    header: "#E1F5EE",
    headerText: "#0F6E56",
    bottomBar: "#0F6E56",
    borderLight: "#9FE1CB",
  },
  Bế: {
    primary: "#993556",
    light: "#FBEAF0",
    badge: "#F4C0D1",
    badgeText: "#72243E",
    header: "#FBEAF0",
    headerText: "#993556",
    bottomBar: "#993556",
    borderLight: "#F4C0D1",
  },
  Dứt: {
    primary: "#A32D2D",
    light: "#FCEBEB",
    badge: "#F7C1C1",
    badgeText: "#791F1F",
    header: "#FCEBEB",
    headerText: "#A32D2D",
    bottomBar: "#A32D2D",
    borderLight: "#F7C1C1",
  },
  Dán: {
    primary: "#085041",
    light: "#E1F5EE",
    badge: "#5DCAA5",
    badgeText: "#04342C",
    header: "#E1F5EE",
    headerText: "#085041",
    bottomBar: "#085041",
    borderLight: "#5DCAA5",
  },
  phong_ban_1: {
    primary: "#534AB7",
    light: "#EEEDFE",
    badge: "#CECBF6",
    badgeText: "#3C3489",
    header: "#EEEDFE",
    headerText: "#534AB7",
    bottomBar: "#534AB7",
    borderLight: "#CECBF6",
  },
  phong_ban_2: {
    primary: "#3B6D11",
    light: "#EAF3DE",
    badge: "#C0DD97",
    badgeText: "#27500A",
    header: "#EAF3DE",
    headerText: "#3B6D11",
    bottomBar: "#3B6D11",
    borderLight: "#C0DD97",
  },
  phong_ban_3: {
    primary: "#993556",
    light: "#FBEAF0",
    badge: "#F4C0D1",
    badgeText: "#72243E",
    header: "#FBEAF0",
    headerText: "#993556",
    bottomBar: "#993556",
    borderLight: "#F4C0D1",
  },
};

const DEFAULT_THEME: RoleTheme = {
  primary: "#2563eb",
  light: "#eff6ff",
  badge: "#bfdbfe",
  badgeText: "#1e40af",
  header: "#fff",
  headerText: "#2563eb",
  bottomBar: "#2563eb",
  borderLight: "#bfdbfe",
};

const getRoleTheme = (roleName: string): RoleTheme =>
  ROLE_THEMES[roleName] ?? DEFAULT_THEME;

/* ================= HELPERS ================= */

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
  return r;
};

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

/* ================= STATUS HELPERS ================= */

type StatusFilter =
  | "ALL"
  | "InProcessing"
  | "Ready"
  | "Finished"
  | "Unassigned";

const STATUS_LABELS: Record<StatusFilter, string> = {
  ALL: "Tất cả",
  Ready: "Sẵn sàng",
  InProcessing: "Đang SX",
  Finished: "Hoàn thành",
  Unassigned: "Chờ",
};

const STATUS_FILTER_KEYS: StatusFilter[] = [
  "ALL",
  "InProcessing",
  "Ready",
  "Finished",
  "Unassigned",
];

const getStatusLabel = (status: string) => {
  switch (status) {
    case "Finished":
      return "Hoàn thành";
    case "InProcessing":
      return "Đang sản xuất";
    case "Ready":
      return "Sẵn sàng";
    case "Scheduled":
      return "Chờ lịch";
    case "Unassigned":
      return "Chưa gán";
    default:
      return status || "--";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Finished":
      return "#3B6D11";
    case "InProcessing":
      return "#854F0B";
    case "Ready":
      return "#185FA5";
    case "Scheduled":
      return "#5F5E5A";
    case "Unassigned":
      return "#888780";
    default:
      return "#888780";
  }
};

const getStatusBg = (status: string) => {
  switch (status) {
    case "Finished":
      return "#EAF3DE";
    case "InProcessing":
      return "#FAEEDA";
    case "Ready":
      return "#E6F1FB";
    default:
      return "#F1EFE8";
  }
};

const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
  switch (status) {
    case "Finished":
      return "checkmark-circle";
    case "InProcessing":
      return "time";
    case "Ready":
      return "play-circle";
    case "Scheduled":
      return "calendar";
    case "Unassigned":
      return "ellipsis-horizontal-circle";
    default:
      return "help-circle";
  }
};

/* ================= COMPONENT ================= */

export default function Dashboard() {
  const [role, setRole] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedProcess, setSelectedProcess] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const theme = getRoleTheme(role);
  const allowedProcesses = useMemo(() => getAllowedProcesses(role), [role]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("jwt");
      const res = await fetch("http://10.0.2.2:5233/api/Tasks/get-all-task", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Fetch tasks error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadRole = async () => {
      const roleId = await SecureStore.getItemAsync("role_id");
      if (roleId) setRole(getRoleName(roleId));
      fetchTasks();
    };
    loadRole();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, []),
  );

  useEffect(() => {
    setSelectedProcess("ALL");
    setStatusFilter("ALL");
  }, [role]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (allowedProcesses.length === 0) return true;
        return allowedProcesses.some(
          (p) => p.toLowerCase() === t.name?.toLowerCase(),
        );
      })
      .filter(
        (t) =>
          selectedProcess === "ALL" ||
          t.name?.toLowerCase() === selectedProcess.toLowerCase(),
      )
      .filter((t) => statusFilter === "ALL" || t.status === statusFilter)
      .filter((t) => {
        if (!searchText) return true;
        const text = searchText.toLowerCase();
        return (
          t.task_id.toString().includes(text) ||
          t.prod_id.toString().includes(text) ||
          t.name?.toLowerCase().includes(text) ||
          t.machine?.toLowerCase().includes(text)
        );
      })
      .sort((a, b) => {
        const order: Record<string, number> = {
          InProcessing: 1,
          Ready: 2,
          Unassigned: 3,
          Scheduled: 4,
          Finished: 5,
        };
        const diff = (order[a.status] ?? 99) - (order[b.status] ?? 99);
        return diff !== 0 ? diff : b.task_id - a.task_id;
      });
  }, [tasks, allowedProcesses, selectedProcess, statusFilter, searchText]);

  const stats = useMemo(() => {
    const relevant = tasks.filter((t) => {
      if (allowedProcesses.length === 0) return true;
      return allowedProcesses.some(
        (p) => p.toLowerCase() === t.name?.toLowerCase(),
      );
    });
    return {
      total: relevant.length,
      inProcessing: relevant.filter((t) => t.status === "InProcessing").length,
      ready: relevant.filter((t) => t.status === "Ready").length,
      finished: relevant.filter((t) => t.status === "Finished").length,
      unassigned: relevant.filter(
        (t) => t.status === "Unassigned" || t.status === "Scheduled",
      ).length,
    };
  }, [tasks, allowedProcesses]);

  const formatDateTime = (date?: string | null) => {
    if (!date) return "--";
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const renderTask = ({ item }: { item: Task }) => {
    const statusColor = getStatusColor(item.status);
    const statusBg = getStatusBg(item.status);
    const statusIcon = getStatusIcon(item.status);

    return (
      <TouchableOpacity
        style={[styles.taskCard, { borderLeftColor: statusColor }]}
        activeOpacity={0.8}
        onPress={() =>
          router.push({
            pathname: "/order/[id]",
            params: { id: item.prod_id, type: "single" },
          })
        }
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskIds}>
            <Text style={[styles.taskId, { color: theme.primary }]}>
              Task #{item.task_id}
            </Text>
            <Text style={styles.taskProdId}>Lệnh: #{item.prod_id}</Text>
          </View>
          <View
            style={[
              styles.statusChip,
              { backgroundColor: statusBg, borderColor: statusColor },
            ]}
          >
            <Ionicons name={statusIcon} size={13} color={statusColor} />
            <Text style={[styles.statusChipText, { color: statusColor }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.taskBody}>
          <View style={styles.taskRow}>
            <Ionicons name="settings-outline" size={14} color={theme.primary} />
            <Text style={styles.taskLabel}>Công đoạn</Text>
            <Text
              style={[styles.taskValue, { color: theme.primary }]}
              numberOfLines={1}
            >
              {item.name || "--"}
            </Text>
          </View>
          <View style={styles.taskRow}>
            <Ionicons name="hardware-chip-outline" size={14} color="#888780" />
            <Text style={styles.taskLabel}>Máy</Text>
            <Text style={styles.taskValue} numberOfLines={1}>
              {item.machine || "--"}
            </Text>
          </View>
          <View style={styles.taskRow}>
            <Feather name="calendar" size={13} color="#888780" />
            <Text style={styles.taskLabel}>Kế hoạch</Text>
            <Text style={styles.taskValue} numberOfLines={1}>
              {formatDateTime(item.planned_start_time)} →{" "}
              {formatDateTime(item.planned_end_time)}
            </Text>
          </View>
          {(item.start_time || item.end_time) && (
            <View style={styles.taskRow}>
              <Ionicons name="time-outline" size={14} color="#888780" />
              <Text style={styles.taskLabel}>Thực tế</Text>
              <Text style={styles.taskValue} numberOfLines={1}>
                {formatDateTime(item.start_time)} →{" "}
                {formatDateTime(item.end_time)}
              </Text>
            </View>
          )}
          {item.reason && (
            <View style={styles.taskReasonRow}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color="#888780"
              />
              <Text style={styles.taskReason} numberOfLines={2}>
                {item.reason}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.header,
            borderBottomColor: theme.borderLight,
          },
        ]}
      >
        <View style={styles.headerTextWrap}>
          <Image
            source={require("../assets/logo_removed.png")}
            style={styles.logo}
          />
          <Text
            style={[styles.company, { color: theme.headerText }]}
            numberOfLines={2}
          >
            Công Ty TNHH TM & DV In & Bao Bì Đại Phúc Hải
          </Text>
        </View>
      </View>

      {/* PAGE TITLE */}
      <View style={styles.pageTitleRow}>
        <Ionicons name="grid-outline" size={20} color={theme.primary} />
        <Text style={[styles.pageTitle, { color: theme.primary }]}>
          Dashboard
        </Text>
        <View style={[styles.roleBadge, { backgroundColor: theme.badge }]}>
          <Text
            style={[styles.roleBadgeText, { color: theme.badgeText }]}
            numberOfLines={1}
          >
            {getRoleDisplayName(role)}
          </Text>
        </View>
      </View>

      {/* STATS — 5 cột grid, không dùng gap (Android không hỗ trợ gap trong View) */}
      <View style={styles.statsGrid}>
        {[
          {
            bg: theme.light,
            color: theme.primary,
            icon: "layers-outline",
            val: stats.total,
            label: "Tổng",
          },
          {
            bg: "#FAEEDA",
            color: "#854F0B",
            icon: "time-outline",
            val: stats.inProcessing,
            label: "Đang SX",
          },
          {
            bg: "#E6F1FB",
            color: "#185FA5",
            icon: "play-circle-outline",
            val: stats.ready,
            label: "Sẵn sàng",
          },
          {
            bg: "#EAF3DE",
            color: "#3B6D11",
            icon: "checkmark-circle-outline",
            val: stats.finished,
            label: "Xong",
          },
          {
            bg: "#F1EFE8",
            color: "#5F5E5A",
            icon: "ellipsis-horizontal-circle-outline",
            val: stats.unassigned,
            label: "Chờ",
          },
        ].map((s, i) => (
          <View
            key={i}
            style={[
              styles.statCard,
              { backgroundColor: s.bg, marginLeft: i === 0 ? 0 : 5 },
            ]}
          >
            <Ionicons name={s.icon as any} size={18} color={s.color} />
            <Text style={[styles.statNumber, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* SEARCH */}
      <View style={[styles.searchBox, { borderColor: theme.borderLight }]}>
        <Ionicons name="search-outline" size={16} color={theme.primary} />
        <TextInput
          placeholder="Tìm task ID, mã lệnh"
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
          placeholderTextColor="#888780"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={16} color="#888780" />
          </TouchableOpacity>
        )}
      </View>

      {/* PROCESS TABS — dùng marginRight thay gap (Android compat) */}
      {allowedProcesses.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ height: 58, marginBottom: 8 }} // 👈 thêm dòng này
          contentContainerStyle={styles.tabsScroll}
        >
          {(["ALL", ...allowedProcesses] as string[]).map((p, i) => {
            const isActive = selectedProcess === p;
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.tabChip,
                  { backgroundColor: isActive ? theme.primary : "#E8E8E8" },
                  i < allowedProcesses.length ? { marginRight: 6 } : {},
                ]}
                onPress={() => setSelectedProcess(p)}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    { color: isActive ? "#ffffff" : "#444441" },
                  ]}
                >
                  {p === "ALL" ? "Tất cả" : p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* STATUS FILTER — dùng marginRight thay gap */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ height: 50, marginBottom: 4 }} // 👈 thêm dòng này
        contentContainerStyle={styles.statusScroll}
      >
        {STATUS_FILTER_KEYS.map((key, i) => {
          const isActive = statusFilter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.statusChipFilter,
                {
                  backgroundColor: isActive ? theme.primary : "#ffffff",
                  borderColor: isActive ? theme.primary : "#D3D1C7",
                },
                i < STATUS_FILTER_KEYS.length - 1 ? { marginRight: 6 } : {},
              ]}
              onPress={() => setStatusFilter(key)}
            >
              <Text
                style={[
                  styles.statusChipFilterText,
                  { color: isActive ? "#ffffff" : "#444441" },
                ]}
              >
                {STATUS_LABELS[key]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* INFO ROW */}
      <View style={styles.infoRow}>
        <Ionicons name="list-outline" size={16} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.primary }]}>
          {filteredTasks.length} task
          {selectedProcess !== "ALL" ? ` · ${selectedProcess}` : ""}
          {statusFilter !== "ALL" ? ` · ${STATUS_LABELS[statusFilter]}` : ""}
        </Text>
      </View>

      {/* TASK LIST */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => String(item.task_id)}
          renderItem={renderTask}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="file-tray-outline" size={48} color="#D3D1C7" />
              <Text style={styles.emptyText}>Không có task nào</Text>
            </View>
          }
        />
      )}

      {/* BOTTOM BAR */}
      <View style={[styles.bottomBar, { backgroundColor: theme.bottomBar }]}>
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => router.replace("/home")}
        >
          <Ionicons
            name="calendar-outline"
            size={26}
            color="rgba(255,255,255,0.65)"
          />
          <Text style={styles.bottomTabText}>Sản xuất</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomTab}>
          <Ionicons name="grid" size={26} color="#fff" />
          <Text style={styles.bottomTabTextActive}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => router.push("/profile")}
        >
          <Ionicons
            name="person-outline"
            size={26}
            color="rgba(255,255,255,0.65)"
          />
          <Text style={styles.bottomTabText}>Hồ sơ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  headerTextWrap: { flex: 1, minWidth: 0 },
  company: { fontSize: 12, lineHeight: 17, fontWeight: "500" },

  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pageTitle: { fontSize: 18, fontWeight: "700", flex: 1, marginLeft: 8 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 180,
  },
  roleBadgeText: { fontSize: 10, fontWeight: "600" },

  /* STATS — flex row, marginLeft thay gap */
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.06)",
  },
  statNumber: { fontSize: 17, fontWeight: "700", marginTop: 3 },
  statLabel: {
    fontSize: 9,
    color: "#5F5E5A",
    marginTop: 2,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 13,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 14,
    paddingHorizontal: 10,
    borderRadius: 10,
    height: 38,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#2C2C2A",
    paddingVertical: 0,
    marginHorizontal: 8,
  },

  /* TABS — paddingHorizontal + marginRight thay gap */
  tabsScroll: {
    paddingHorizontal: 14,
    alignItems: "center", // thay paddingVertical bằng cái này
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8, // tăng từ 7 → 8
    borderRadius: 16,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  tabChipText: {
    fontSize: 13, // tăng từ 12 → 13
    fontWeight: "600",
  },

  /* STATUS FILTER */
  statusScroll: {
    paddingHorizontal: 14,
    alignItems: "center", // thay paddingVertical bằng cái này
  },
  statusChipFilter: {
    paddingHorizontal: 14,
    paddingVertical: 8, // tăng từ 6 → 8
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34, // thêm minHeight để không bị bé
  },
  statusChipFilterText: {
    fontSize: 13, // tăng từ 11 → 13
    fontWeight: "600",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 6,
  },
  infoText: { fontSize: 12, fontWeight: "500", marginLeft: 6 },

  /* TASK CARD */
  taskCard: {
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.07)",
    overflow: "hidden",
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  taskIds: { flex: 1, minWidth: 0, marginRight: 8 },
  taskId: { fontSize: 14, fontWeight: "700" },
  taskProdId: { fontSize: 11, color: "#888780", marginTop: 2 },

  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusChipText: { fontSize: 11, fontWeight: "600", marginLeft: 4 },

  taskBody: { paddingHorizontal: 12, paddingVertical: 8 },
  taskRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  taskLabel: {
    fontSize: 11,
    color: "#888780",
    width: 66,
    flexShrink: 0,
    paddingTop: 1,
    marginLeft: 7,
  },
  taskValue: {
    fontSize: 12,
    color: "#2C2C2A",
    fontWeight: "500",
    flex: 1,
    lineHeight: 17,
  },

  taskReasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
    backgroundColor: "#F1EFE8",
    padding: 8,
    borderRadius: 8,
  },
  taskReason: {
    fontSize: 11,
    color: "#5F5E5A",
    flex: 1,
    lineHeight: 16,
    marginLeft: 7,
  },

  logo: { width: 60, height: 40, resizeMode: "contain", marginRight: 10 },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#5F5E5A", fontSize: 14 },

  emptyBox: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyText: { marginTop: 12, color: "#B4B2A9", fontSize: 15 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 76,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 8,
  },
  bottomTab: { alignItems: "center", paddingHorizontal: 16 },
  bottomTabText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    marginTop: 2,
  },
  bottomTabTextActive: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
});
