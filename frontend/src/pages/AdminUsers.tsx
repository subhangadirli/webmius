import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, Refresh01Icon, Settings01Icon } from '@hugeicons/core-free-icons'
import { AppBar } from '@skeletonlabs/skeleton-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext.tsx'
import ThemeToggle from '../components/ThemeToggle.tsx'
import type { AdminUser, ConnectionLogEntry, SSHConnection } from '../types'

type SortKey = 'newest' | 'oldest' | 'username_az' | 'username_za' | 'most_connections' | 'least_connections'

const PAGE_SIZES = [10, 20, 50]

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function AdminUsers() {
  const { user } = useAuth()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  // Search / filter / sort / pagination
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  // Detail drawer
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AdminUser | null>(null)
  const [detailConnections, setDetailConnections] = useState<SSHConnection[]>([])
  const [detailLogs, setDetailLogs] = useState<ConnectionLogEntry[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [permDraft, setPermDraft] = useState<{ can_ssh: boolean; max_connections: string }>({
    can_ssh: true,
    max_connections: '',
  })
  const [permSaving, setPermSaving] = useState(false)

  // Reset-password modal
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetSaving, setResetSaving] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await api.listAdminUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [query, roleFilter, statusFilter, sortKey, pageSize])

  useEffect(() => {
    if (detailId === null) {
      setDetail(null)
      return
    }
    let cancelled = false
    const load = async () => {
      setDetailLoading(true)
      setDetailError(null)
      try {
        const [u, conns, logs] = await Promise.all([
          api.getAdminUser(detailId),
          api.listAdminUserConnections(detailId),
          api.listAdminUserLogs(detailId),
        ])
        if (cancelled) return
        setDetail(u)
        setDetailConnections(conns)
        setDetailLogs(logs)
        setPermDraft({ can_ssh: u.can_ssh, max_connections: u.max_connections?.toString() ?? '' })
      } catch (err) {
        if (!cancelled) setDetailError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [detailId])

  const stats = useMemo(() => {
    const list = users ?? []
    const total = list.length
    const admins = list.filter((u) => u.role === 'admin').length
    const active = list.filter((u) => u.is_active).length
    return { total, admins, active, disabled: total - active }
  }, [users])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = (users ?? []).filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter === 'active' && !u.is_active) return false
      if (statusFilter === 'disabled' && u.is_active) return false
      if (q && !u.username.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
      return true
    })
    switch (sortKey) {
      case 'newest':
        list = [...list].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
        break
      case 'oldest':
        list = [...list].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
        break
      case 'username_az':
        list = [...list].sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()))
        break
      case 'username_za':
        list = [...list].sort((a, b) => b.username.toLowerCase().localeCompare(a.username.toLowerCase()))
        break
      case 'most_connections':
        list = [...list].sort((a, b) => b.connection_count - a.connection_count)
        break
      case 'least_connections':
        list = [...list].sort((a, b) => a.connection_count - b.connection_count)
        break
    }
    return list
  }, [users, query, roleFilter, statusFilter, sortKey])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  const allPageSelected = pageItems.length > 0 && pageItems.every((u) => selectedIds.has(u.id))

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        for (const u of pageItems) next.delete(u.id)
      } else {
        for (const u of pageItems) next.add(u.id)
      }
      return next
    })
  }

  const patchUser = async (target: AdminUser, patch: Parameters<typeof api.updateAdminUser>[1]) => {
    setActionError(null)
    setBusyId(target.id)
    try {
      const updated = await api.updateAdminUser(target.id, patch)
      setUsers((prev) => prev.map((u) => (u.id === target.id ? updated : u)))
      if (detail?.id === target.id) {
        setDetail(updated)
        setPermDraft({ can_ssh: updated.can_ssh, max_connections: updated.max_connections?.toString() ?? '' })
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleRoleChange = async (target: AdminUser, newRole: AdminUser['role']) => {
    if (newRole === target.role) return
    if (!window.confirm(`Change user "${target.username}" role to "${newRole}"?`)) return
    await patchUser(target, { role: newRole })
  }

  const handleToggleActive = async (target: AdminUser) => {
    const next = !target.is_active
    if (!window.confirm(`${next ? 'Activate' : 'Suspend'} user "${target.username}"?${next ? '' : ' They will be signed out immediately.'}`)) return
    await patchUser(target, { is_active: next })
  }

  const handleDelete = async (target: AdminUser) => {
    if (!window.confirm(`Delete user "${target.username}" and all their connections?`)) return
    setActionError(null)
    setBusyId(target.id)
    try {
      await api.deleteAdminUser(target.id)
      setUsers((prev) => prev.filter((u) => u.id !== target.id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(target.id)
        return next
      })
      if (detailId === target.id) setDetailId(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const runBulk = async (
    label: string,
    ids: number[],
    fn: (target: AdminUser) => Promise<void>,
  ) => {
    if (ids.length === 0) return
    if (!window.confirm(`${label} ${ids.length} user${ids.length === 1 ? '' : 's'}?`)) return
    setBulkBusy(true)
    setActionError(null)
    const failures: string[] = []
    for (const id of ids) {
      const target = (users ?? []).find((u) => u.id === id)
      if (!target) continue
      try {
        await fn(target)
      } catch (err) {
        failures.push(`${target.username}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    if (failures.length > 0) setActionError(`Some actions failed:\n${failures.join('\n')}`)
    setSelectedIds(new Set())
    setBulkBusy(false)
  }

  const bulkTargets = useMemo(() => {
    // Self-modifying bulk ops are blocked server-side; filter self out up front
    // so one bad row doesn't fail the whole batch.
    return [...selectedIds].filter((id) => id !== user?.id)
  }, [selectedIds, user?.id])

  const handleSavePermissions = async () => {
    if (!detail) return
    const raw = permDraft.max_connections.trim()
    let max_connections: number | null = null
    if (raw !== '') {
      const parsed = Number(raw)
      if (!Number.isInteger(parsed) || parsed < 0) {
        setDetailError('Connection limit must be a non-negative whole number or empty (unlimited).')
        return
      }
      max_connections = parsed
    }
    setPermSaving(true)
    setDetailError(null)
    try {
      const updated = await api.updateAdminUser(detail.id, {
        can_ssh: permDraft.can_ssh,
        max_connections,
      })
      setDetail(updated)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err))
    } finally {
      setPermSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetTarget) return
    setResetError(null)
    if (!newPassword) {
      setResetError('New password is required.')
      return
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.')
      return
    }
    setResetSaving(true)
    try {
      await api.resetAdminUserPassword(resetTarget.id, newPassword)
      setResetTarget(null)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setResetError(err instanceof Error ? err.message : String(err))
    } finally {
      setResetSaving(false)
    }
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
          <h2 className="h3">Admins only</h2>
          <p className="opacity-60">You don&rsquo;t have access to this page.</p>
          <Link to="/dashboard" className="btn preset-tonal">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <AppBar>
        <AppBar.Toolbar className="grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto]">
          <AppBar.Lead>
            <p className="h4">Users</p>
          </AppBar.Lead>
          <AppBar.Headline />
          <AppBar.Trail className="flex-wrap items-center justify-end gap-2">
            <Link to="/dashboard" className="btn btn-sm preset-tonal">
              Back to dashboard
            </Link>
            <Link to="/settings" className="btn btn-sm preset-tonal">
              <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.5} />
              Settings
            </Link>
            <ThemeToggle />
          </AppBar.Trail>
        </AppBar.Toolbar>
      </AppBar>

      <main className="mx-auto max-w-5xl space-y-4 p-6">
        {actionError && <p className="text-error-500 text-sm whitespace-pre-line">{actionError}</p>}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="card preset-filled-surface-100-900 p-3 text-center">
            <p className="h4">{stats.total}</p>
            <p className="text-xs opacity-60">Total users</p>
          </div>
          <div className="card preset-filled-surface-100-900 p-3 text-center">
            <p className="h4">{stats.admins}</p>
            <p className="text-xs opacity-60">Admins</p>
          </div>
          <div className="card preset-filled-surface-100-900 p-3 text-center">
            <p className="h4">{stats.active}</p>
            <p className="text-xs opacity-60">Active</p>
          </div>
          <div className="card preset-filled-surface-100-900 p-3 text-center">
            <p className="h4">{stats.disabled}</p>
            <p className="text-xs opacity-60">Suspended</p>
          </div>
        </div>

        {/* Toolbar: search / filters / sort */}
        <div className="card preset-filled-surface-100-900 flex flex-col gap-2 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              aria-label="Search users"
              placeholder="Search username or email…"
              className="input flex-1"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Filter by role"
              className="select sm:w-36"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            >
              <option value="all">All roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>
            <select
              aria-label="Filter by status"
              className="select sm:w-36"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Suspended</option>
            </select>
            <select
              aria-label="Sort users"
              className="select sm:w-48"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="username_az">Username A–Z</option>
              <option value="username_za">Username Z–A</option>
              <option value="most_connections">Most connections</option>
              <option value="least_connections">Fewest connections</option>
            </select>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-surface-500/20 pt-2">
              <span className="text-sm opacity-70">
                {selectedIds.size} selected{user && selectedIds.has(user.id) ? ' (your own account is excluded from bulk changes)' : ''}
              </span>
              <button
                type="button"
                className="btn btn-sm preset-tonal"
                disabled={bulkBusy}
                onClick={() => runBulk('Promote to admin', bulkTargets, (t) => patchUser(t, { role: 'admin' }))}
              >
                Promote
              </button>
              <button
                type="button"
                className="btn btn-sm preset-tonal"
                disabled={bulkBusy}
                onClick={() => runBulk('Demote to user', bulkTargets, (t) => patchUser(t, { role: 'user' }))}
              >
                Demote
              </button>
              <button
                type="button"
                className="btn btn-sm preset-tonal"
                disabled={bulkBusy}
                onClick={() => runBulk('Activate', bulkTargets, (t) => patchUser(t, { is_active: true }))}
              >
                Activate
              </button>
              <button
                type="button"
                className="btn btn-sm preset-tonal"
                disabled={bulkBusy}
                onClick={() => runBulk('Suspend', bulkTargets, (t) => patchUser(t, { is_active: false }))}
              >
                Suspend
              </button>
              <button
                type="button"
                className="btn btn-sm preset-tonal-error"
                disabled={bulkBusy}
                onClick={() =>
                  runBulk('Delete', bulkTargets, async (t) => {
                    await api.deleteAdminUser(t.id)
                    setUsers((prev) => prev.filter((u) => u.id !== t.id))
                  })
                }
              >
                Delete
              </button>
              <button type="button" className="btn btn-sm preset-tonal" onClick={() => setSelectedIds(new Set())}>
                Clear
              </button>
            </div>
          )}
        </div>

        {loading && <p className="opacity-60">Loading users…</p>}

        {!loading && loadError && (
          <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
            <h2 className="h3">Couldn&rsquo;t load users</h2>
            <p className="text-error-500 text-sm">{loadError}</p>
            <button type="button" className="btn preset-tonal" onClick={loadUsers}>
              <HugeiconsIcon icon={Refresh01Icon} size={16} strokeWidth={1.5} />
              Retry
            </button>
          </div>
        )}

        {!loading && !loadError && filtered.length === 0 && (
          <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
            <h2 className="h3">No users match</h2>
            <p className="opacity-60">Try clearing the search or filters.</p>
          </div>
        )}

        {!loading && !loadError && filtered.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-sm opacity-70">
              <input
                type="checkbox"
                aria-label="Select all users on this page"
                checked={allPageSelected}
                onChange={toggleSelectPage}
              />
              <span>
                Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of{' '}
                {filtered.length}
              </span>
            </div>

            <ul className="space-y-2">
              {pageItems.map((target) => {
                const isSelf = user?.id === target.id
                const busy = busyId === target.id
                return (
                  <li
                    key={target.id}
                    className="card preset-filled-surface-100-900 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${target.username}`}
                        className="mt-1"
                        checked={selectedIds.has(target.id)}
                        onChange={() => toggleSelect(target.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold break-words">
                          {target.username}
                          {isSelf && <span className="opacity-60"> (you)</span>}
                          {!target.is_active && (
                            <span className="badge preset-tonal-error ml-2 text-xs">suspended</span>
                          )}
                        </p>
                        <p className="text-sm opacity-60 break-words">{target.email}</p>
                        <p className="text-xs opacity-60">
                          {target.connection_count} connection{target.connection_count === 1 ? '' : 's'}
                          {' · '}last login {formatDate(target.last_login_at)}
                          {!target.can_ssh && ' · SSH off'}
                          {target.max_connections !== null && target.max_connections !== undefined &&
                            ` · limit ${target.max_connections}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <select
                        aria-label={`Role for ${target.username}`}
                        className="select w-28 text-xs"
                        value={target.role}
                        disabled={isSelf || busy}
                        title={isSelf ? 'You cannot change your own role' : 'Change user role'}
                        onChange={(e) => handleRoleChange(target, e.target.value as AdminUser['role'])}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn-sm preset-tonal"
                        disabled={isSelf || busy}
                        title={isSelf ? 'You cannot suspend your own account' : target.is_active ? 'Suspend account' : 'Activate account'}
                        onClick={() => handleToggleActive(target)}
                      >
                        {target.is_active ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm preset-tonal"
                        onClick={() => setDetailId(target.id)}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm preset-tonal-error"
                        onClick={() => handleDelete(target)}
                        disabled={busy || isSelf}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
                        Delete
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <select
                aria-label="Users per page"
                className="select w-36 text-xs"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm preset-tonal"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  Prev
                </button>
                <span className="text-sm opacity-70">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm preset-tonal"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Detail drawer */}
      {detailId !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setDetailId(null)}>
          <div
            className="bg-surface-100-900 flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="User details"
          >
            <div className="flex items-center justify-between">
              <h2 className="h3">User details</h2>
              <button type="button" className="btn btn-sm preset-tonal" onClick={() => setDetailId(null)}>
                Close
              </button>
            </div>
            {detailLoading && <p className="opacity-60">Loading…</p>}
            {detailError && <p className="text-error-500 text-sm">{detailError}</p>}
            {detail && (
              <>
                <div className="card preset-filled-surface-100-900 space-y-1 p-4 text-sm">
                  <p className="font-semibold break-words">{detail.username}</p>
                  <p className="opacity-60 break-words">{detail.email}</p>
                  <p className="opacity-60">Role: {detail.role}</p>
                  <p className="opacity-60">Status: {detail.is_active ? 'active' : 'suspended'}</p>
                  <p className="opacity-60">Connections: {detail.connection_count}</p>
                  <p className="opacity-60">Created: {formatDate(detail.created_at)}</p>
                  <p className="opacity-60">Last login: {formatDate(detail.last_login_at)}</p>
                </div>

                <div className="card preset-filled-surface-100-900 space-y-2 p-4">
                  <h3 className="font-semibold">Permissions</h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={permDraft.can_ssh}
                      onChange={(e) => setPermDraft((d) => ({ ...d, can_ssh: e.target.checked }))}
                    />
                    Can open SSH sessions
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span>Connection limit (empty = unlimited)</span>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={permDraft.max_connections}
                      onChange={(e) => setPermDraft((d) => ({ ...d, max_connections: e.target.value }))}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm preset-tonal"
                    disabled={permSaving}
                    onClick={handleSavePermissions}
                  >
                    {permSaving ? 'Saving…' : 'Save permissions'}
                  </button>
                </div>

                <div className="card preset-filled-surface-100-900 space-y-2 p-4">
                  <h3 className="font-semibold">Connections ({detailConnections.length})</h3>
                  {detailConnections.length === 0 && <p className="text-sm opacity-60">No saved connections.</p>}
                  {detailConnections.slice(0, 10).map((c) => (
                    <p key={c.id} className="text-sm break-words opacity-80">
                      {c.name} — {c.username}@{c.host}:{c.port} ({c.auth_type})
                    </p>
                  ))}
                  {detailConnections.length > 10 && (
                    <p className="text-xs opacity-60">…and {detailConnections.length - 10} more</p>
                  )}
                </div>

                <div className="card preset-filled-surface-100-900 space-y-2 p-4">
                  <h3 className="font-semibold">Recent activity ({detailLogs.length})</h3>
                  {detailLogs.length === 0 && <p className="text-sm opacity-60">No recorded sessions.</p>}
                  {detailLogs.slice(0, 10).map((l) => (
                    <p key={l.id} className="text-sm break-words opacity-80">
                      {l.status} — {l.connection_name} ({l.host}) · {formatDate(l.started_at)}
                    </p>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm preset-tonal"
                    onClick={() => {
                      setResetTarget(detail)
                      setNewPassword('')
                      setConfirmPassword('')
                      setResetError(null)
                    }}
                  >
                    Reset password
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm preset-tonal"
                    disabled={detail.id === user?.id}
                    onClick={() => handleToggleActive(detail)}
                  >
                    {detail.is_active ? 'Suspend account' : 'Activate account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setResetTarget(null)}>
          <div
            className="bg-surface-100-900 card w-full max-w-md space-y-3 p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`Reset password for ${resetTarget.username}`}
          >
            <h2 className="h4">Reset password — {resetTarget.username}</h2>
            <p className="text-xs opacity-60">
              Sets a new password immediately. Outstanding self-service reset links are revoked. Existing
              sessions stay valid — suspend the account first if you need an immediate lockout.
            </p>
            {resetError && <p className="text-error-500 text-sm">{resetError}</p>}
            <input
              type="password"
              aria-label="New password"
              placeholder="New password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              aria-label="Confirm new password"
              placeholder="Confirm new password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-sm preset-tonal" onClick={() => setResetTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm preset-filled-primary-700-300"
                disabled={resetSaving}
                onClick={handleResetPassword}
              >
                {resetSaving ? 'Saving…' : 'Set password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
