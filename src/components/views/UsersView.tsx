import React, { useState } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  UserCheck,
  UserPlus,
  KeyRound,
  History,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Edit2,
  Trash2,
  LogIn,
  Building,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { UserRole, UserProfile } from '../../types/finance';
import { formatDateIN } from '../../utils/formatters';

export const UsersView: React.FC = () => {
  const {
    userProfile,
    role,
    allUsers,
    switchActiveUser,
    addUser,
    updateUser,
    deleteUser,
    updateUserRole,
    hasPermission,
  } = useAuth();
  const { auditLogs } = useFinance();

  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'roles_guide'>('users');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDepartment, setNewDepartment] = useState('Operations & Accounts');
  const [newRole, setNewRole] = useState<UserRole>('manager');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('manager');

  const handleRoleChange = async (userId: string, targetRole: UserRole) => {
    try {
      await updateUserRole(userId, targetRole);
      setSuccessMsg(`Role successfully updated to ${targetRole.toUpperCase()}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update role');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.displayName || '');
    setEditEmail(user.email || '');
    setEditPhone(user.phoneNumber || '');
    setEditDepartment(user.department || '');
    setEditRole(user.role);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateUser(editingUser.id, {
        displayName: editName,
        email: editEmail,
        phoneNumber: editPhone,
        department: editDepartment,
        role: editRole,
      });
      setSuccessMsg(`Individual user "${editName}" and role (${editRole.toUpperCase()}) updated!`);
      setEditingUser(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user profile');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg('Please enter the individual user name.');
      return;
    }
    try {
      const created = await addUser({
        displayName: newName.trim(),
        email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '.')}@budgetmanagement.app`,
        phoneNumber: newPhone.trim() || '+91-9845012345',
        department: newDepartment.trim(),
        role: newRole,
        accountKind: 'standard_user',
        avatarColor: newRole === 'admin' ? '#059669' : newRole === 'manager' ? '#0284c7' : '#8b5cf6',
      });
      setSuccessMsg(`New user "${created.displayName}" created with role ${newRole.toUpperCase()}!`);
      setIsAddUserOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove individual "${name}" from the system?`)) return;
    try {
      await deleteUser(userId);
      setSuccessMsg(`User "${name}" has been removed.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete user');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Individual Users & Editable Role Access (RBAC)
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                role === 'admin'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : role === 'manager'
                  ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                  : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
              }`}
            >
              Active Individual: {userProfile?.displayName || 'User'} ({role.toUpperCase()})
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customize the application for each individual. Edit user roles (Admin, Manager, Data Entry) and switch profiles seamlessly.
          </p>
        </div>

        {/* Tab switchers & Add User Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Individuals ({allUsers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('roles_guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'roles_guide'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Role Permissions</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Logs</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Individual</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs font-medium animate-fadeIn">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab: Users List */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Individual Team & Personnel Directory
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Each individual experiences tailored permissions and views. User roles are editable in real time.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total: {allUsers.length} Users
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {allUsers.map((u) => {
              const isCurrent = userProfile?.id === u.id;
              return (
                <div
                  key={u.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isCurrent
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0"
                        style={{ backgroundColor: u.avatarColor || (u.role === 'admin' ? '#059669' : u.role === 'manager' ? '#0284c7' : '#8b5cf6') }}
                      >
                        {u.displayName?.substring(0, 2).toUpperCase() || 'US'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {u.displayName}
                          </p>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                              ACTIVE PROFILE
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : u.role === 'manager'
                                ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300'
                                : 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300'
                            }`}
                          >
                            {u.role === 'admin' ? 'Admin' : u.role === 'manager' ? 'Manager' : 'Data Entry'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {u.department && (
                            <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                              <Building className="w-3 h-3 text-slate-400" />
                              {u.department}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {u.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {u.phoneNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Role Selector */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                    {/* Inline Role Selector */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-slate-400 px-1">Role:</span>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        title="Edit User Role"
                      >
                        <option value="admin">Administrator (Full Access)</option>
                        <option value="manager">Manager (Read & Write)</option>
                        <option value="data_entry">Data Entry (Entry Only)</option>
                      </select>
                    </div>

                    {/* Edit Profile Button */}
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Edit Individual Profile & Role"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Switch Profile / Log in as this individual */}
                    {!isCurrent && (
                      <button
                        onClick={() => {
                          switchActiveUser(u.id);
                          setSuccessMsg(`Switched active profile to ${u.displayName} (${u.role.toUpperCase()})`);
                          setTimeout(() => setSuccessMsg(''), 3000);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all shadow-2xs active:scale-95"
                        title="Use the application as this individual"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Use Profile</span>
                      </button>
                    )}

                    {/* Delete Individual */}
                    {u.id !== 'dev_admin_naseer' && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.displayName || 'User')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Individual"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Role Permissions Guide */}
      {activeTab === 'roles_guide' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Admin Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase">
                Administrator
              </span>
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Full System Access
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Complete administrative authority over the ERP platform. Can edit any individual's role, export/import backups, and manage bank accounts.
            </p>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Create, edit, & delete transactions</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Assign and edit user roles</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Configure monthly budget thresholds</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Access tamper-evident audit logs</span>
              </li>
            </ul>
          </div>

          {/* Manager Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-sky-500/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 uppercase">
                Finance Manager
              </span>
              <UserCheck className="w-5 h-5 text-sky-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Financial Management
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Designed for department leads and financial planners. Can view reports, record entries, settle debts, and review category budget warnings.
            </p>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-sky-600" />
                <span>Record inflows, outflows & transfers</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-sky-600" />
                <span>Manage bills, EMIs & Khata debts</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-sky-600" />
                <span>View 6-month trends & P&L statements</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <X className="w-3.5 h-3.5 text-slate-400" />
                <span>Cannot modify user roles or system settings</span>
              </li>
            </ul>
          </div>

          {/* Data Entry Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-purple-500/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 uppercase">
                Data Entry Clerk
              </span>
              <KeyRound className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Focused Ledger Logging
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Streamlined for cashier and receipt data entry. Restricts high-risk functions, budget alteration, and user access while enabling rapid daily logging.
            </p>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-purple-600" />
                <span>Quick 5-second transaction entry</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-purple-600" />
                <span>Upload bill receipts & invoices</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-purple-600" />
                <span>Search and filter transaction ledger</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <X className="w-3.5 h-3.5 text-slate-400" />
                <span>Cannot delete accounts or change roles</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Immutable Financial Ledger Audit Trail
            </h2>
            <span className="text-xs text-slate-400">
              Logged with Individual Signatures
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
              No mutations recorded in the current session. Creating, editing or deleting transactions generates tamper-evident logs.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        log.action === 'UPDATE' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                        log.action === 'DELETE' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                        'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      }`}>
                        {log.action}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {log.entityType}
                      </span>
                      <span className="text-slate-400 font-mono">[{log.entityId}]</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 pl-1">
                      {log.details}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center text-slate-400">
                    <span>By: <strong className="text-slate-700 dark:text-slate-300">{log.performedBy}</strong></span>
                    <span>{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Individual User Modal */}
      {isAddUserOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsAddUserOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Individual User
                </h3>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department / Organization Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Accounts & Billing, Inventory Lead"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91-9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="rahul@budgetmanagement.app"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assign Editable Role *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  <option value="admin">Administrator (Complete System Authority)</option>
                  <option value="manager">Finance Manager (Read & Write)</option>
                  <option value="data_entry">Data Entry Operator (Ledger Input Only)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Create Individual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Individual User & Role Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Individual & Role
                  </h3>
                  <p className="text-[11px] text-slate-400">ID: {editingUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department / Description
                </label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Editable Individual Role *
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  <option value="admin">Administrator (Complete System Authority)</option>
                  <option value="manager">Finance Manager (Read & Write)</option>
                  <option value="data_entry">Data Entry Operator (Ledger Input Only)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Changing this role will immediately adapt all access permissions for this individual.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
