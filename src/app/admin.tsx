import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatDay, formatTime } from '@/lib/activities';
import { confirmAction } from '@/lib/confirm';
import {
  fetchAdminReports,
  fetchBannedUsers,
  REPORT_REASONS,
  type AdminReport,
  type BannedUser,
  type ReportStatus,
} from '@/lib/reports';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type Tab = 'open' | 'all' | 'banned' | 'feedback';

type Feedback = { id: string; body: string; created_at: string; user_id: string; name: string };

// Feedback from the Profile tab, newest first, with who sent it.
async function fetchFeedback(): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('id, body, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = data as Omit<Feedback, 'name'>[];
  const { data: people } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', [...new Set(rows.map((r) => r.user_id))]);
  const names = new Map((people ?? []).map((p) => [p.id as string, p.display_name as string]));
  return rows.map((r) => ({ ...r, name: names.get(r.user_id) ?? 'Someone' }));
}

// Moderation screen, only for admins (also enforced by the database functions).
export default function AdminScreen() {
  const { isAdmin } = useAuth();
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [banned, setBanned] = useState<BannedUser[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [tab, setTab] = useState<Tab>('open');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [loadedReports, loadedBanned] = await Promise.all([
        fetchAdminReports(),
        fetchBannedUsers(),
      ]);
      setReports(loadedReports);
      setBanned(loadedBanned);
      setError(null);
      // Separate, so reports still load if the feedback table isn't set up yet.
      setFeedback(await fetchFeedback().catch(() => []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reports.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) load();
    }, [isAdmin, load])
  );

  if (!isAdmin) return <Redirect href="/" />;

  // Runs a moderation action for one report, then reloads the list.
  async function act(
    reportId: string,
    action: () => PromiseLike<{ error: { message: string } | null }>
  ) {
    setBusyId(reportId);
    const { error } = await action();
    if (error) setError(error.message);
    await load();
    setBusyId(null);
  }

  function setStatus(report: AdminReport, status: ReportStatus) {
    act(report.id, () =>
      supabase.rpc('admin_set_report_status', { report_id: report.id, new_status: status })
    );
  }

  async function deleteActivity(report: AdminReport) {
    const ok = await confirmAction(
      'Delete this activity?',
      `"${report.activity_title}" and its group chat will be removed for everyone.`,
      'Delete'
    );
    if (!ok) return;
    act(report.id, async () => {
      const result = await supabase.rpc('admin_delete_activity', {
        target_activity: report.activity_id,
      });
      if (result.error) return result;
      return supabase.rpc('admin_set_report_status', {
        report_id: report.id,
        new_status: 'actioned',
      });
    });
  }

  async function toggleBan(report: AdminReport, userId: string, name: string, banned: boolean) {
    if (!banned) {
      const ok = await confirmAction(
        `Ban ${name}?`,
        "They won't be able to post, join or chat, their activities disappear, and their upcoming ones are deleted.",
        'Ban'
      );
      if (!ok) return;
    }
    act(report.id, async () => {
      if (banned) return supabase.rpc('admin_unban_user', { target_user: userId });
      const result = await supabase.rpc('admin_ban_user', {
        target_user: userId,
        ban_reason: REPORT_REASONS[report.reason],
      });
      if (result.error) return result;
      return supabase.rpc('admin_set_report_status', {
        report_id: report.id,
        new_status: 'actioned',
      });
    });
  }

  function unban(userId: string) {
    act(userId, () => supabase.rpc('admin_unban_user', { target_user: userId }));
  }

  const shown = (reports ?? []).filter((r) => tab === 'all' || r.status === 'open');
  const openCount = (reports ?? []).filter((r) => r.status === 'open').length;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <Chip
            label={`Open (${openCount})`}
            selected={tab === 'open'}
            onPress={() => setTab('open')}
          />
          <Chip label="All reports" selected={tab === 'all'} onPress={() => setTab('all')} />
          <Chip
            label={`Banned (${banned.length})`}
            selected={tab === 'banned'}
            onPress={() => setTab('banned')}
          />
          <Chip
            label={`Feedback (${feedback.length})`}
            selected={tab === 'feedback'}
            onPress={() => setTab('feedback')}
          />
        </View>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {reports === null ? (
          <ActivityIndicator size="large" style={styles.spinner} />
        ) : tab === 'feedback' ? (
          feedback.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">No feedback yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Testers can send it from the Profile tab.
              </ThemedText>
            </ThemedView>
          ) : (
            feedback.map((item) => (
              <ThemedView key={item.id} type="backgroundElement" style={styles.card}>
                <Pressable onPress={() => router.push(`/user/${item.user_id}`)}>
                  <ThemedText type="smallBold">
                    {item.name} · {formatDay(new Date(item.created_at))}{' '}
                    {formatTime(new Date(item.created_at))}
                  </ThemedText>
                </Pressable>
                <ThemedText type="small">{item.body}</ThemedText>
                {busyId === item.id ? (
                  <ActivityIndicator />
                ) : (
                  <Action
                    label="Done, remove"
                    onPress={() =>
                      act(item.id, () => supabase.from('feedback').delete().eq('id', item.id))
                    }
                  />
                )}
              </ThemedView>
            ))
          )
        ) : tab === 'banned' ? (
          banned.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Nobody is banned</ThemedText>
            </ThemedView>
          ) : (
            banned.map((person) => (
              <ThemedView key={person.user_id} type="backgroundElement" style={styles.bannedRow}>
                <Avatar profile={person} />
                <Pressable
                  style={styles.grow}
                  onPress={() => router.push(`/user/${person.user_id}`)}>
                  <ThemedText type="smallBold">{person.display_name ?? 'Unknown'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {person.reason ?? 'No reason given'} · {formatDay(new Date(person.banned_at))}
                  </ThemedText>
                </Pressable>
                {busyId === person.user_id ? (
                  <ActivityIndicator />
                ) : (
                  <Action label="Unban" onPress={() => unban(person.user_id)} />
                )}
              </ThemedView>
            ))
          )
        ) : shown.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">
              {tab === 'all' ? 'No reports yet' : 'No open reports'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              You&apos;ll also get an email when a new report comes in.
            </ThemedText>
          </ThemedView>
        ) : (
          shown.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              busy={busyId === report.id}
              onStatus={(status) => setStatus(report, status)}
              onDeleteActivity={() => deleteActivity(report)}
              onToggleBan={(userId, name, banned) => toggleBan(report, userId, name, banned)}
            />
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

type ReportCardProps = {
  report: AdminReport;
  busy: boolean;
  onStatus: (status: ReportStatus) => void;
  onDeleteActivity: () => void;
  onToggleBan: (userId: string, name: string, banned: boolean) => void;
};

function ReportCard({ report, busy, onStatus, onDeleteActivity, onToggleBan }: ReportCardProps) {
  const created = new Date(report.created_at);
  // The person to act on: whoever was reported, or the host of a reported activity.
  const targetId = report.reported_user_id ?? report.activity_host_id;
  const targetName =
    (report.reported_user_id ? report.reported_user_name : report.activity_host_name) ?? 'user';

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.cardTop}>
        <ThemedText type="smallBold">{REPORT_REASONS[report.reason] ?? report.reason}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {report.status === 'open'
            ? '🔴 Open'
            : report.status === 'actioned'
              ? '✅ Actioned'
              : '👀 Reviewed'}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {formatDay(created)} · {formatTime(created)} · by {report.reporter_name ?? 'someone'}
      </ThemedText>

      {report.details && <ThemedText type="small">&quot;{report.details}&quot;</ThemedText>}

      {report.reported_user_id && (
        <Pressable onPress={() => router.push(`/user/${report.reported_user_id}`)}>
          <ThemedText type="small">
            👤{' '}
            <ThemedText type="linkPrimary">
              {report.reported_user_name ?? 'Deleted user'}
            </ThemedText>
            {report.target_banned ? ' (banned)' : ''}
          </ThemedText>
        </Pressable>
      )}
      {report.activity_id && (
        <ThemedText type="small">📌 {report.activity_title ?? 'Deleted activity'}</ThemedText>
      )}

      {busy ? (
        <ActivityIndicator style={styles.actionsSpinner} />
      ) : (
        <View style={styles.actions}>
          {report.activity_id && report.activity_title && (
            <Action label="Delete activity" danger onPress={onDeleteActivity} />
          )}
          {targetId && (
            <Action
              label={report.target_banned ? `Unban ${targetName}` : `Ban ${targetName}`}
              danger={!report.target_banned}
              onPress={() => onToggleBan(targetId, targetName, report.target_banned)}
            />
          )}
          {report.status !== 'reviewed' && (
            <Action label="Mark reviewed" onPress={() => onStatus('reviewed')} />
          )}
          {report.status !== 'open' && <Action label="Reopen" onPress={() => onStatus('open')} />}
        </View>
      )}
    </ThemedView>
  );
}

function Action({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundSelected" style={styles.action}>
        <ThemedText type="smallBold" style={danger && styles.danger}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  bannedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  grow: {
    flex: 1,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.two,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actionsSpinner: {
    marginTop: Spacing.two,
  },
  action: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  danger: {
    color: '#e5484d',
  },
  error: {
    color: '#e5484d',
  },
  spinner: {
    marginTop: Spacing.six,
  },
  pressed: {
    opacity: 0.7,
  },
});
