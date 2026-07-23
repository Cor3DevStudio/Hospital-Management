import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Save,
  Plus,
  Trash2,
  Database,
  RotateCcw,
  Building,
  Shield,
  Upload,
  FileText,
  UserPlus,
  Key,
  Percent,
  Coins,
  CheckCircle2,
  BedDouble,
  Layers,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { PageAccessModal } from "@/components/PageAccessModal";
import {
  MAINTENANCE_FIX_FEE_LABEL,
  SYSTEM_SERVICE_POLICY_SUMMARY,
} from "@/lib/systemServicePolicy";
import { PageHeader } from "@/components/PageHeader";
import { pageAccessSummary, normalizePageAccess } from "@/lib/pageAccess";
import { hasValidSession, updateSessionPageAccess } from "@/lib/auth/authService";
import {
  useStore,
  todayISO,
  persistStoreNow,
  type AppState,
  type PriceItem,
  type User,
} from "@/lib/store";
import {
  loadAllFromDatabase,
  mergeDatabaseIntoState,
  saveAllToDatabase,
} from "@/lib/services/syncService";
import { pauseAutoSync, resumeAutoSync } from "@/lib/services/autoSyncService";
import {
  createUserViaApi,
  deleteUserViaApi,
  updateUserPageAccessViaApi,
} from "@/lib/services/userService";
import { fetchCaseRateCount } from "@/lib/services/caseRateApi";
import { createPriceItem, deletePriceItem, updatePriceItem } from "@/lib/services/priceListService";
import { ensureDefaultRoomRates, getRoomRateItems } from "@/lib/services/roomBoardService";
import { ensureDefaultMiscFees, getMiscFeeItems } from "@/lib/services/miscellaneousService";
import { getPriceHistoryForItem } from "@/lib/priceService";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Hospital CMS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { state, setState, resetAll } = useStore();
  const currentUser = state.users.find((u) => u.username === state.authedUser);
  const isAdmin = currentUser?.role === "Administrator";
  const { setDarkMode, isDark } = useStore();
  const [hospital, setHospital] = useState(state.hospital);
  const [newUser, setNewUser] = useState<User>({
    id: "",
    username: "",
    fullName: "",
    role: "Receptionist",
    active: true,
  });
  const [newUserPhilhealthAccreditation, setNewUserPhilhealthAccreditation] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [pageAccessUser, setPageAccessUser] = useState<User | null>(null);
  const [pageAccessSaving, setPageAccessSaving] = useState(false);

  // Custom local state for Billing Settings
  const [taxPercent, setTaxPercent] = useState<number>(12);
  const [softwareKey, setSoftwareKey] = useState<string>("CMS-CERT-2026-X89");
  const [caseRateCount, setCaseRateCount] = useState(0);

  useEffect(() => {
    if (!state.authedUser || !hasValidSession()) return;
    void fetchCaseRateCount()
      .then(setCaseRateCount)
      .catch(() => setCaseRateCount(0));
  }, [state.authedUser]);
  const [defaultPEN, setDefaultPEN] = useState<string>("PEN-12-89271821-3");
  const [dbSyncing, setDbSyncing] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [lastDbSync, setLastDbSync] = useState<string | null>(null);

  const [roomForm, setRoomForm] = useState<PriceItem>({
    id: "",
    code: "",
    description: "",
    caseRate: 0,
    category: "Room Rate",
    effectiveDate: todayISO(),
  });
  const [roomEditId, setRoomEditId] = useState<string | null>(null);

  const [miscForm, setMiscForm] = useState<PriceItem>({
    id: "",
    code: "",
    description: "",
    caseRate: 0,
    category: "Miscellaneous",
    effectiveDate: todayISO(),
  });
  const [miscEditId, setMiscEditId] = useState<string | null>(null);

  useEffect(() => {
    setState((s) => ensureDefaultMiscFees(ensureDefaultRoomRates(s)));
  }, [setState]);

  const roomRates = useMemo(() => getRoomRateItems(state), [state.prices, state.priceHistories]);
  const roomHistory = roomEditId ? getPriceHistoryForItem(state, "priceItem", roomEditId) : [];
  const miscFees = useMemo(() => getMiscFeeItems(state), [state.prices, state.priceHistories]);
  const miscHistory = miscEditId ? getPriceHistoryForItem(state, "priceItem", miscEditId) : [];

  const saveRoomRate = () => {
    if (!isAdmin) return toast.error("Administrator access required.");
    if (!roomForm.code || !roomForm.description)
      return toast.error("Code and room type name are required.");
    if (roomForm.caseRate < 0) return toast.error("Daily rate cannot be negative.");
    const payload = { ...roomForm, category: "Room Rate" as const };
    if (roomEditId) {
      setState((s) => updatePriceItem(s, { ...payload, id: roomEditId }));
      toast.success("Room rate updated (versioned by As of Date).");
    } else {
      setState((s) => createPriceItem(s, payload));
      toast.success("Room rate created.");
    }
    setRoomEditId(null);
    setRoomForm({
      id: "",
      code: "",
      description: "",
      caseRate: 0,
      category: "Room Rate",
      effectiveDate: todayISO(),
    });
  };

  const editRoomRate = (item: PriceItem) => {
    setRoomEditId(item.id);
    setRoomForm({ ...item, category: "Room Rate", effectiveDate: todayISO() });
  };

  const removeRoomRate = (id: string) => {
    if (!isAdmin) return toast.error("Administrator access required.");
    if (!confirm("Delete this room type rate?")) return;
    setState((s) => deletePriceItem(s, id));
    if (roomEditId === id) {
      setRoomEditId(null);
      setRoomForm({
        id: "",
        code: "",
        description: "",
        caseRate: 0,
        category: "Room Rate",
        effectiveDate: todayISO(),
      });
    }
    toast.success("Room rate removed.");
  };

  const emptyMiscForm = (): PriceItem => ({
    id: "",
    code: "",
    description: "",
    caseRate: 0,
    category: "Miscellaneous",
    effectiveDate: todayISO(),
  });

  const saveMiscFee = () => {
    if (!isAdmin) return toast.error("Administrator access required.");
    if (!miscForm.code || !miscForm.description)
      return toast.error("Code and fee name are required.");
    if (miscForm.caseRate < 0) return toast.error("Rate cannot be negative.");
    const payload = { ...miscForm, category: "Miscellaneous" as const };
    if (miscEditId) {
      setState((s) => updatePriceItem(s, { ...payload, id: miscEditId }));
      toast.success("Miscellaneous fee updated (versioned by As of Date).");
    } else {
      setState((s) => createPriceItem(s, payload));
      toast.success("Miscellaneous fee type created.");
    }
    setMiscEditId(null);
    setMiscForm(emptyMiscForm());
  };

  const editMiscFee = (item: PriceItem) => {
    setMiscEditId(item.id);
    setMiscForm({ ...item, category: "Miscellaneous", effectiveDate: todayISO() });
  };

  const removeMiscFee = (id: string) => {
    if (!isAdmin) return toast.error("Administrator access required.");
    if (!confirm("Delete this miscellaneous fee type?")) return;
    setState((s) => deletePriceItem(s, id));
    if (miscEditId === id) {
      setMiscEditId(null);
      setMiscForm(emptyMiscForm());
    }
    toast.success("Miscellaneous fee type removed.");
  };

  const saveSecuritySettings = async () => {
    if (!isAdmin) return toast.error("Administrator access required.");

    pauseAutoSync();
    persistStoreNow();

    let snapshot: AppState | null = null;
    setState((current) => {
      snapshot = current;
      return current;
    });

    if (!snapshot) {
      resumeAutoSync();
      return toast.error("Could not read current settings.");
    }

    try {
      setDbSyncing(true);
      const result = await saveAllToDatabase(snapshot);
      setLastDbSync(result.updatedAt ?? new Date().toISOString());
      toast.success("Security settings saved locally and to MariaDB.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Database sync failed.");
    } finally {
      setDbSyncing(false);
      resumeAutoSync();
    }
  };

  const saveHospital = async () => {
    const nextHospital = hospital;
    setState((s) => ({ ...s, hospital: nextHospital }));
    try {
      setDbSyncing(true);
      const result = await saveAllToDatabase({ ...state, hospital: nextHospital });
      setLastDbSync(result.updatedAt ?? new Date().toISOString());
      toast.success("Hospital profile saved locally and to MariaDB.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Saved locally but database sync failed.",
      );
    } finally {
      setDbSyncing(false);
    }
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.fullName)
      return toast.error("Username and full name are required.");
    if (!newUserPassword || newUserPassword.length < 6) {
      return toast.error("Password is required (minimum 6 characters).");
    }
    if (state.users.some((u) => u.username.toLowerCase() === newUser.username.toLowerCase())) {
      return toast.error("Username already exists.");
    }

    const result = await createUserViaApi({
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role,
      password: newUserPassword,
    });

    if (!result.success || !result.user) {
      return toast.error(result.message ?? "Failed to create user.");
    }

    setState((s) => ({ ...s, users: [...s.users, result.user!] }));
    toast.success(`User '${newUser.username}' added to MariaDB.`);
    setNewUser({ id: "", username: "", fullName: "", role: "Receptionist", active: true });
    setNewUserPassword("");
  };

  const savePageAccess = async (pageAccess: string[]) => {
    if (!pageAccessUser) return;
    setPageAccessSaving(true);
    try {
      const normalized = normalizePageAccess(pageAccess);
      const result = await updateUserPageAccessViaApi(pageAccessUser.id, normalized);
      if (!result.success) {
        return toast.error(result.message ?? "Failed to update page access.");
      }
      const editedUsername = pageAccessUser.username;
      setState((s) => ({
        ...s,
        users: s.users.map((u) =>
          u.id === pageAccessUser.id ? { ...u, pageAccess: normalized } : u,
        ),
      }));
      if (state.authedUser && editedUsername.toLowerCase() === state.authedUser.toLowerCase()) {
        updateSessionPageAccess(normalized);
      }
      setPageAccessUser(null);
      toast.success("Page access updated.");
    } finally {
      setPageAccessSaving(false);
    }
  };

  const removeUser = async (id: string) => {
    const result = await deleteUserViaApi(id);
    if (!result.success) {
      return toast.error(result.message ?? "Failed to remove user.");
    }

    setState((s) => ({
      ...s,
      users: s.users.filter((u) => u.id !== id),
    }));
    toast.success("User account removed from database.");
  };

  const backup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hospital-cms-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("System backup configuration downloaded!");
  };

  const restoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.patients && parsed.bills && parsed.consultations && parsed.inventory) {
          setState(parsed);
          toast.success("System database successfully restored!");
        } else {
          toast.error("Invalid database backup schema.");
        }
      } catch (err) {
        toast.error("Failed to parse the database JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const saveBillingSettings = async () => {
    try {
      setDbSyncing(true);
      const result = await saveAllToDatabase(state);
      setLastDbSync(result.updatedAt ?? new Date().toISOString());
      toast.success("Billing settings saved to database.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Database sync failed.");
    } finally {
      setDbSyncing(false);
    }
  };

  const saveAllPagesToDatabase = async () => {
    try {
      setDbSyncing(true);
      const result = await saveAllToDatabase(state);
      setLastDbSync(result.updatedAt ?? new Date().toISOString());
      const total = Object.values(result.counts ?? {}).reduce((a, b) => a + b, 0);
      toast.success(`Saved all modules to MariaDB (${total} records across clinical data).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save to database.");
    } finally {
      setDbSyncing(false);
    }
  };

  const loadAllPagesFromDatabase = async () => {
    try {
      setDbLoading(true);
      const { payload, updatedAt } = await loadAllFromDatabase();
      if (!payload) {
        toast.info("No clinical data found in MariaDB yet. Use Save All to Database first.");
        return;
      }
      pauseAutoSync();
      setState((s) => mergeDatabaseIntoState(s, payload, { preferDatabase: true }));
      resumeAutoSync();
      setLastDbSync(updatedAt);
      toast.success("Loaded all clinical data from MariaDB.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load from database.");
    } finally {
      setDbLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings & System Admin"
        description="Configure hospital demographics, user credentials, tax frameworks, and manage system database entries."
      />
      <div className="p-6 space-y-6">
        <Tabs defaultValue="hospital" className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-7 max-w-5xl bg-muted p-1 rounded-lg text-muted-foreground">
            <TabsTrigger value="hospital" className="text-xs flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" /> Hospital Profile
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Access Control
            </TabsTrigger>
            <TabsTrigger value="rooms" className="text-xs flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5" /> Room & Board
            </TabsTrigger>
            <TabsTrigger value="misc" className="text-xs flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Miscellaneous
            </TabsTrigger>
            <TabsTrigger value="billing" className="text-xs flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" /> Billing & eClaims
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Security
            </TabsTrigger>
            <TabsTrigger value="backup" className="text-xs flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Maintenance
            </TabsTrigger>
          </TabsList>

          {/* HOSPITAL PROFILE TAB */}
          <TabsContent value="hospital">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Building className="h-4 w-4 text-blue-600" /> Hospital Demographic Profile
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure the general header details printed on SOAs and clinical prescriptions.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Institution name
                  </Label>
                  <Input
                    value={hospital.name}
                    onChange={(e) => setHospital({ ...hospital, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Contact phone
                  </Label>
                  <Input
                    value={hospital.phone}
                    onChange={(e) => setHospital({ ...hospital, phone: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Street / Mailing Address
                  </Label>
                  <Input
                    value={hospital.address}
                    onChange={(e) => setHospital({ ...hospital, address: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Official Email address
                  </Label>
                  <Input
                    value={hospital.email}
                    onChange={(e) => setHospital({ ...hospital, email: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Corporate Tax ID (TIN)
                  </Label>
                  <Input
                    value={hospital.tin}
                    onChange={(e) => setHospital({ ...hospital, tin: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground font-semibold text-blue-600 font-sans">
                    PhilHealth Institutional Accreditation No. (PAN)
                  </Label>
                  <Input
                    value={hospital.philhealthAccreditation}
                    onChange={(e) =>
                      setHospital({ ...hospital, philhealthAccreditation: e.target.value })
                    }
                    className="h-9 text-xs font-mono font-bold text-blue-700"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end pt-2">
                  <Button
                    onClick={saveHospital}
                    disabled={dbSyncing}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs h-9"
                  >
                    <Save className="h-4 w-4 mr-1" /> {dbSyncing ? "Saving…" : "Save Profile"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECURITY TAB */}
          <TabsContent value="security">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Shield className="h-4 w-4 text-rose-600" /> Security & Session
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure automatic logout on inactivity and session timeout behaviors.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 pt-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Inactivity Timeout (minutes)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(state.inactivityTimeoutMinutes ?? 0)}
                    onChange={(e) => {
                      const minutes = Math.max(0, Number(e.target.value) || 0);
                      setState((s) => ({ ...s, inactivityTimeoutMinutes: minutes }));
                    }}
                    onBlur={() => persistStoreNow()}
                    className="h-9 text-xs max-w-xs"
                    disabled={!isAdmin}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    After this many minutes with no mouse/keyboard activity, the user is logged out
                    immediately (no countdown). Applies right away. Set 0 to disable.
                  </p>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground font-semibold">Appearance</Label>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={!!isDark}
                      onCheckedChange={(v) => setDarkMode(!!v)}
                      disabled={!isAdmin}
                    />
                    <div>
                      <div className="text-sm font-medium">Dark mode</div>
                      <div className="text-[11px] text-muted-foreground">
                        Toggle application night mode. Preference is saved per account when signed
                        in.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end pt-2">
                  <Button
                    onClick={() => void saveSecuritySettings()}
                    disabled={!isAdmin || dbSyncing}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs h-9"
                  >
                    <Save className="h-4 w-4 mr-1" /> Save Security Settings
                  </Button>
                  {!isAdmin && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Only administrators may change session timeout settings.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* USER ACCESS CONTROL TAB */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <UserPlus className="h-4 w-4 text-blue-600" /> Register User Account
                </CardTitle>
                <CardDescription className="text-xs">
                  Create new user credentials to delegate receptionist, nursing, clinical, or
                  billing tasks.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-3 md:grid-cols-6 items-end">
                  <div className="space-y-1.5 md:col-span-1">
                    <Label className="text-xs text-muted-foreground font-semibold">Username</Label>
                    <Input
                      placeholder="username"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs text-muted-foreground font-semibold">
                      Full Profile Name
                    </Label>
                    <Input
                      placeholder="Dr. Sophia Cruz"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-semibold">Password</Label>
                    <Input
                      type="password"
                      placeholder="min. 6 chars"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-semibold">
                      Assigned Role
                    </Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(v) => setNewUser({ ...newUser, role: v as User["role"] })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["Administrator", "Doctor", "Receptionist", "Cashier"] as const).map(
                          (r) => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {r}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={addUser}
                    disabled={!isAdmin}
                    className="bg-slate-800 hover:bg-slate-700 text-white h-9 text-xs"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Account
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-bold text-foreground">
                  Existing Accounts
                </CardTitle>
                <CardDescription className="text-xs">
                  List of configured user login profiles.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Page Access</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {u.username}
                        </TableCell>
                        <TableCell className="font-medium text-xs">{u.fullName}</TableCell>
                        <TableCell className="text-xs">{u.role}</TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={!isAdmin}
                              onClick={() => setPageAccessUser(u)}
                            >
                              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                              Manage
                            </Button>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {pageAccessSummary(u)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeUser(u.id)}
                            disabled={u.username === "admin"}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ROOM & BOARD RATES */}
          <TabsContent value="rooms" className="space-y-4">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <BedDouble className="h-4 w-4 text-blue-600" /> Room & Board Daily Rates
                </CardTitle>
                <CardDescription className="text-xs">
                  Set daily rates per room/ward type. Rates are versioned by As of Date — past
                  admissions keep the rate effective on each stay start date.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">Code</Label>
                  <Input
                    value={roomForm.code}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, code: e.target.value.toUpperCase() })
                    }
                    className="h-9 text-xs font-mono"
                    placeholder="RB-WARD"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Room / Ward Type
                  </Label>
                  <Input
                    value={roomForm.description}
                    onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                    className="h-9 text-xs"
                    placeholder="Ward, Semi-Private, Private, ICU…"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Daily Rate (₱)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={roomForm.caseRate}
                    onChange={(e) => setRoomForm({ ...roomForm, caseRate: Number(e.target.value) })}
                    className="h-9 text-xs"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">As of Date</Label>
                  <Input
                    type="date"
                    value={roomForm.effectiveDate || todayISO()}
                    onChange={(e) => setRoomForm({ ...roomForm, effectiveDate: e.target.value })}
                    className="h-9 text-xs"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  {roomEditId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-9"
                      onClick={() => {
                        setRoomEditId(null);
                        setRoomForm({
                          id: "",
                          code: "",
                          description: "",
                          caseRate: 0,
                          category: "Room Rate",
                          effectiveDate: todayISO(),
                        });
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button
                    onClick={saveRoomRate}
                    disabled={!isAdmin}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs h-9"
                  >
                    <Save className="h-4 w-4 mr-1" /> {roomEditId ? "Update Rate" : "Add Room Type"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm font-bold">Configured Room Types</CardTitle>
                <CardDescription className="text-xs">
                  Current daily rates used for automatic Room & Board charging on discharge.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Daily Rate</TableHead>
                      <TableHead>As of</TableHead>
                      <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roomRates.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          No room rates configured yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      roomRates.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="pl-4 text-xs font-mono">{item.code}</TableCell>
                          <TableCell className="text-xs font-medium">{item.description}</TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            ₱{item.caseRate.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs">{item.effectiveDate}</TableCell>
                          <TableCell className="text-right pr-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => editRoomRate(item)}
                              disabled={!isAdmin}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeRoomRate(item.id)}
                              disabled={!isAdmin}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {roomEditId && roomHistory.length > 0 && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-sm font-bold">
                    Rate History (As of Date versions)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  {roomHistory.map((h) => (
                    <div
                      key={h.id}
                      className="flex justify-between text-xs rounded border px-3 py-2"
                    >
                      <span>Effective {h.effectiveDate}</span>
                      <span className="font-mono font-semibold">
                        ₱{h.amount.toLocaleString()}/day
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* MISCELLANEOUS FEE RATES */}
          <TabsContent value="misc" className="space-y-4">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Layers className="h-4 w-4 text-blue-600" /> Miscellaneous Fee Types
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure Delivery Room Fee, Operating Room Fee, and other miscellaneous charges.
                  Rates are versioned by As of Date.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">Code</Label>
                  <Input
                    value={miscForm.code}
                    onChange={(e) =>
                      setMiscForm({ ...miscForm, code: e.target.value.toUpperCase() })
                    }
                    className="h-9 text-xs font-mono"
                    placeholder="MISC-DR"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">Fee Name</Label>
                  <Input
                    value={miscForm.description}
                    onChange={(e) => setMiscForm({ ...miscForm, description: e.target.value })}
                    className="h-9 text-xs"
                    placeholder="Delivery Room Fee, Operating Room Fee…"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">Rate (₱)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={miscForm.caseRate}
                    onChange={(e) => setMiscForm({ ...miscForm, caseRate: Number(e.target.value) })}
                    className="h-9 text-xs"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">As of Date</Label>
                  <Input
                    type="date"
                    value={miscForm.effectiveDate || todayISO()}
                    onChange={(e) => setMiscForm({ ...miscForm, effectiveDate: e.target.value })}
                    className="h-9 text-xs"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  {miscEditId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-9"
                      onClick={() => {
                        setMiscEditId(null);
                        setMiscForm(emptyMiscForm());
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button
                    onClick={saveMiscFee}
                    disabled={!isAdmin}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs h-9"
                  >
                    <Save className="h-4 w-4 mr-1" /> {miscEditId ? "Update Fee" : "Add Fee Type"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm font-bold">Configured Fee Types</CardTitle>
                <CardDescription className="text-xs">
                  Available in the Miscellaneous module for posting to patient bills.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Code</TableHead>
                      <TableHead>Fee Name</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead>As of</TableHead>
                      <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {miscFees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          No miscellaneous fees configured yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      miscFees.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="pl-4 text-xs font-mono">{item.code}</TableCell>
                          <TableCell className="text-xs font-medium">{item.description}</TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            ₱{item.caseRate.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs">{item.effectiveDate}</TableCell>
                          <TableCell className="text-right pr-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => editMiscFee(item)}
                              disabled={!isAdmin}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeMiscFee(item.id)}
                              disabled={!isAdmin}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {miscEditId && miscHistory.length > 0 && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-sm font-bold">
                    Rate History (As of Date versions)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  {miscHistory.map((h) => (
                    <div
                      key={h.id}
                      className="flex justify-between text-xs rounded border px-3 py-2"
                    >
                      <span>Effective {h.effectiveDate}</span>
                      <span className="font-mono font-semibold">₱{h.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* BILLING & ECLAIMS SETTINGS */}
          <TabsContent value="billing">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Percent className="h-4 w-4 text-emerald-600" /> Billing Frameworks
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure defaults for VAT calculation and transaction taxes.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Value Added Tax (VAT %)
                  </Label>
                  <Input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Withholding Tax Policy
                  </Label>
                  <Select defaultValue="none">
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        None (Zero-rated)
                      </SelectItem>
                      <SelectItem value="1percent" className="text-xs">
                        1% (Supplies withholding)
                      </SelectItem>
                      <SelectItem value="2percent" className="text-xs">
                        2% (Professional fees withholding)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader className="border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Key className="h-4 w-4 text-blue-600" /> PhilHealth eClaims Credentials
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage software certification tags, series transmittals, and credential
                  configurations.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Default Employer PEN
                  </Label>
                  <Input
                    value={defaultPEN}
                    onChange={(e) => setDefaultPEN(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Software Certification Tag Key
                  </Label>
                  <Input
                    value={softwareKey}
                    onChange={(e) => setSoftwareKey(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end pt-2">
                  <Button
                    onClick={saveBillingSettings}
                    disabled={dbSyncing}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs h-9"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />{" "}
                    {dbSyncing ? "Saving…" : "Save Credentials"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SYSTEM MAINTENANCE TAB */}
          <TabsContent value="backup">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Service & storage policy notice */}
              <Card className="md:col-span-2 border-amber-200 bg-amber-50/40">
                <CardHeader className="border-b border-amber-100">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-950">
                    <Shield className="h-4 w-4 text-amber-700" /> Important System Notice
                  </CardTitle>
                  <CardDescription className="text-xs text-amber-900/80">
                    Effective after the Sidebar update · Storage upgraded 2GB → 5GB
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm text-amber-950">
                  <p>{SYSTEM_SERVICE_POLICY_SUMMARY}</p>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-amber-900/90">
                    <li>Free reworks and free revisions are no longer accepted.</li>
                    <li>Every future change to your system is chargeable.</li>
                    <li>
                      Whole-system storage upgraded from 2GB to 5GB to maximize capacity and avoid
                      lagging.
                    </li>
                    <li>
                      If 5GB is overdue or you keep adding beyond 5GB, maintenance / fixing fee is{" "}
                      <span className="font-semibold">{MAINTENANCE_FIX_FEE_LABEL}</span> (7,000
                      Pesos).
                    </li>
                    <li>
                      If 5GB is not enough, we recommend switching from MariaDB to a Hosted Database
                      to avoid storage issues.
                    </li>
                    <li>
                      Fixed costing: Retainer ₱15,000/mo · Revisions ₱5,000 each · Storage overrun
                      ₱7,000 · Hosted DB migration ₱40,000 (we provide) / ₱30,000 (you provide).
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* MariaDB sync */}
              <Card className="md:col-span-2 border-blue-200 bg-blue-50/20">
                <CardHeader className="border-b border-blue-100">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-900">
                    <Database className="h-4 w-4 text-blue-600" /> Save All Pages to MariaDB
                  </CardTitle>
                  <CardDescription className="text-xs text-blue-800/80">
                    Persists every module — Patients, Appointments, Billing, Inventory, Admissions,
                    ER, OPD, Pharmacy, Lab, Radiology, Miscellaneous, Cashier, Medical Records, and
                    PhilHealth Case Rates — to the database.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 md:grid-cols-4">
                    {[
                      ["Patients", state.patients.length],
                      ["Appointments", state.appointments.length],
                      ["OPD Visits", state.consultations.length],
                      ["Bills", state.bills.length],
                      ["Medicines", state.medicines.length],
                      ["Admissions", state.admissions.length],
                      ["Price items", state.prices.length],
                      ["Case rates (DB)", caseRateCount],
                    ].map(([label, count]) => (
                      <div
                        key={label as string}
                        className="rounded border border-border bg-card px-3 py-2 flex justify-between text-card-foreground"
                      >
                        <span>{label as string}</span>
                        <span className="font-mono font-semibold">{count as number}</span>
                      </div>
                    ))}
                  </div>
                  {lastDbSync && (
                    <p className="text-[11px] text-muted-foreground">
                      Last database sync: {new Date(lastDbSync).toLocaleString()}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={saveAllPagesToDatabase}
                      disabled={dbSyncing || !isAdmin}
                      className="text-xs h-9 bg-blue-700 hover:bg-blue-800 text-white"
                    >
                      <Database className="h-4 w-4 mr-1" />
                      {dbSyncing ? "Saving to database…" : "Save All to Database"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={loadAllPagesFromDatabase}
                      disabled={dbLoading || !isAdmin}
                      className="text-xs h-9"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {dbLoading ? "Loading…" : "Load from Database"}
                    </Button>
                  </div>
                  {!isAdmin && (
                    <p className="text-xs text-muted-foreground">
                      Only administrators can sync clinical data to MariaDB.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Backup & Restore card */}
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Database className="h-4 w-4 text-blue-600" /> Database Backup & Configuration
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Download full snapshots of the clinical database or restore from a previously
                    saved JSON file.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="p-4 border border-dashed border-border rounded-lg bg-muted/50 flex flex-col items-center justify-center text-center space-y-3">
                    <Upload className="h-8 w-8 text-slate-400" />
                    <div>
                      <Label
                        htmlFor="restore-file-input"
                        className="cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-3 py-1.5 rounded border border-blue-200 text-xs inline-block transition"
                      >
                        Choose Backup File (.json)
                      </Label>
                      <input
                        id="restore-file-input"
                        type="file"
                        accept=".json"
                        onChange={restoreBackup}
                        className="hidden"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Uploading a backup will overwrite the current session database.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={backup}
                      className="flex-1 text-xs h-9 bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      <Database className="h-4 w-4 mr-1" /> Download Backup File
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Reset Data card */}
              <Card className="border-red-200 bg-red-50/10">
                <CardHeader className="border-b border-red-100">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-800">
                    <RotateCcw className="h-4 w-4 text-red-600" /> Factory System Reset
                  </CardTitle>
                  <CardDescription className="text-xs text-red-600">
                    Clears all clinical data, bills, and registry records back to an empty state.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Warning: A factory reset completely deletes all custom configurations, uploaded
                    backup records, and edits. This action is permanent and cannot be reversed.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (
                        confirm(
                          "Are you absolutely sure you want to clear all clinical data? This deletes all records and cannot be reversed.",
                        )
                      ) {
                        resetAll();
                        toast.success("All data cleared to empty state.");
                      }
                    }}
                    className="w-full text-xs h-9 font-semibold"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" /> Reset Roster & Bills
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <PageAccessModal
        open={!!pageAccessUser}
        user={pageAccessUser}
        onOpenChange={(open) => {
          if (!open) setPageAccessUser(null);
        }}
        onSave={savePageAccess}
        saving={pageAccessSaving}
      />
    </div>
  );
}
