import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  Share,
  Modal,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch, resolveImageUrl } from '../../../lib/api';
import { useAuth } from '../../../context/auth.context';
import { useTheme } from '../../../context/theme.context';
import { useTranslation } from 'react-i18next';
import type { EventWithCounts, Comment, EventInvitee } from '@judien/shared';

type GuestEntry = { handle: string; displayName: string | null };
type InvitedEntry = { name: string; email?: string };
type Guests = { GOING: GuestEntry[]; NO: GuestEntry[]; INVITED: InvitedEntry[] };

const INDIGO = '#4F46E5';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { bottom: safeBottom } = useSafeAreaInsets();
  const zh = i18n.language === 'zh';
  const isAdmin = user?.role === 'ADMIN';

  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);

  const [event, setEvent] = useState<EventWithCounts | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [myRsvp, setMyRsvp] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const [showNoReason, setShowNoReason] = useState(false);
  const [noReason, setNoReason] = useState('');

  const [guests, setGuests] = useState<Guests | null>(null);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [showGuests, setShowGuests] = useState(false);
  const [activeGuestTab, setActiveGuestTab] = useState<'INVITED' | 'GOING' | 'NO'>('GOING');
  const [guestSearch, setGuestSearch] = useState('');

  const [showBlast, setShowBlast] = useState(false);
  const [blastMsg, setBlastMsg] = useState('');
  const [blastChannels, setBlastChannels] = useState<string[]>(['EMAIL', 'IN_APP']);
  const [blastAudience, setBlastAudience] = useState<'rsvped' | 'invited'>('rsvped');
  const [blastSending, setBlastSending] = useState(false);
  const [blastResult, setBlastResult] = useState('');

  useEffect(() => {
    apiFetch<EventWithCounts>(`/events/${id}`)
      .then((ev) => { setEvent(ev); setMyRsvp(ev.myRsvp); })
      .catch(() => setFetchFailed(true));
    apiFetch<Comment[] | { data: Comment[] }>(`/events/${id}/comments`)
      .then((res) => setComments(Array.isArray(res) ? res : res.data))
      .catch(() => {});
  }, [id]);

  const submitRsvp = async (status: 'GOING' | 'NO', reason?: string) => {
    try {
      if (myRsvp === status) {
        await apiFetch(`/events/${id}/rsvp`, { method: 'DELETE' });
        setMyRsvp(null);
      } else {
        await apiFetch(`/events/${id}/rsvp`, {
          method: 'POST',
          body: JSON.stringify({ status, declineReason: reason }),
        });
        setMyRsvp(status);
      }
      const ev = await apiFetch<EventWithCounts>(`/events/${id}`);
      setEvent(ev);
      setMyRsvp(ev.myRsvp);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update RSVP.');
    }
  };

  const handleRsvp = async (status: 'GOING' | 'NO') => {
    if (!user) { Alert.alert(zh ? '請登入' : 'Login required'); return; }
    if (status === 'NO' && myRsvp !== 'NO') { setShowNoReason(true); return; }
    await submitRsvp(status);
  };

  const handleDeclineSubmit = async () => {
    setShowNoReason(false);
    await submitRsvp('NO', noReason.trim() || undefined);
    setNoReason('');
  };

  const handleCreateShareLink = async () => {
    if (!user) { Alert.alert(zh ? '請登入' : 'Login required'); return; }
    setInviteLoading(true);
    try {
      const res = await apiFetch<{ token: string }>(`/events/${id}/share-link`, { method: 'POST' });
      const link = `https://app.judien.tw/${i18n.language}/events/share/${res.token}`;
      setInviteLink(link);
      setShowInviteModal(true);
    } catch (err: any) {
      Alert.alert(zh ? '無法生成分享連結' : 'Failed to generate share link', err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({ message: zh ? `活動分享：${inviteLink}` : `Event share: ${inviteLink}`, url: inviteLink });
    } catch {
      Alert.alert(zh ? '分享失敗' : 'Share failed');
    }
  };

  const loadGuests = async () => {
    if (guests) { setShowGuests(true); return; }
    setGuestsLoading(true);
    try {
      const [rsvpData, inviteesData] = await Promise.all([
        apiFetch<{ GOING: GuestEntry[]; NO: GuestEntry[] }>(`/events/${id}/rsvp/guests`),
        apiFetch<EventInvitee[]>(`/event-invites/event/${id}/invitees`).catch(() => [] as EventInvitee[]),
      ]);
      setGuests({
        GOING: rsvpData.GOING,
        NO: rsvpData.NO,
        INVITED: inviteesData.map((i) => ({ name: i.guestName ?? i.displayName ?? '', email: i.email ?? undefined })),
      });
      setShowGuests(true);
    } catch {
      Alert.alert(zh ? '無法載入出席名單' : 'Failed to load guest list');
    } finally {
      setGuestsLoading(false);
    }
  };

  const handleBlastSend = async () => {
    if (!blastMsg.trim()) return;
    setBlastSending(true);
    setBlastResult('');
    try {
      const res = await apiFetch<{ sent: number }>(`/events/${id}/blast`, {
        method: 'POST',
        body: JSON.stringify({ message: blastMsg, channels: blastChannels, audience: blastAudience }),
      });
      setBlastResult(zh ? `✓ 已發送給 ${res.sent} 人` : `✓ Sent to ${res.sent} people`);
      setBlastMsg('');
    } catch (err: any) {
      setBlastResult(zh ? '發送失敗，請稍後再試。' : 'Failed to send. Please try again.');
    } finally {
      setBlastSending(false);
    }
  };

  const handleComment = async () => {
    if (!commentBody.trim()) return;
    const c = await apiFetch<Comment>(`/events/${id}/comments`, {
      method: 'POST', body: JSON.stringify({ body: commentBody.trim() }),
    });
    setComments((prev) => [...prev, c]);
    setCommentBody('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentBody.trim()) return;
    const updated = await apiFetch<Comment>(`/events/${id}/comments/${commentId}`, {
      method: 'PATCH', body: JSON.stringify({ body: editCommentBody.trim() }),
    });
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, body: updated.body } : c));
    setEditingCommentId(null);
    setEditCommentBody('');
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      zh ? '刪除留言' : 'Delete Comment',
      zh ? '確定要刪除這則留言嗎？' : 'Delete this comment?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            await apiFetch(`/events/${id}/comments/${commentId}`, { method: 'DELETE' });
            setComments((prev) =>
              prev.filter((c) => c.id !== commentId)
                  .map((c) => ({ ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) }))
            );
          },
        },
      ],
    );
  };

  const handleReply = async (parentCommentId: string) => {
    if (!replyBody.trim()) return;
    const reply = await apiFetch<Comment>(`/events/${id}/comments`, {
      method: 'POST', body: JSON.stringify({ body: replyBody.trim(), replyToId: parentCommentId }),
    });
    setComments((prev) =>
      prev.map((c) => c.id === parentCommentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c)
    );
    setReplyBody('');
    setReplyingToId(null);
  };

  if (!event) {
    if (fetchFailed) return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ fontSize: 15, color: '#EF4444', textAlign: 'center' }}>
          {zh ? '載入失敗，請返回重試。' : 'Failed to load event. Please go back and try again.'}
        </Text>
      </View>
    );
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.subtext }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const title = zh ? event.title_zh : event.title_en;
  const desc = zh ? event.description_zh : event.description_en;
  const location = zh ? event.location_zh : event.location_en;
  const fee = event.feeAmount ? `${event.feeCurrency} ${event.feeAmount}` : t('events.free');
  const dateStr = new Date(event.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US');
  const isPast = new Date(event.startAt) < new Date();

  const rsvpBtn = (status: 'GOING' | 'NO', label: string) => (
    <TouchableOpacity
      key={status}
      style={[styles.rsvpBtn, myRsvp === status && styles.rsvpBtnActive]}
      onPress={() => handleRsvp(status)}
    >
      <Text style={[styles.rsvpBtnText, myRsvp === status && styles.rsvpBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  // Height of the sticky input bar so ScrollView content isn't hidden behind it
  const inputBarHeight = user ? 64 : 0;

  return (
    <KeyboardAvoidingView
      style={[styles.kav, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: inputBarHeight + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {resolveImageUrl(event.coverImageUrl) && (
          <View style={[styles.coverWrapper, { backgroundColor: colors.border }]}>
            <Image source={{ uri: resolveImageUrl(event.coverImageUrl)! }} style={styles.cover} />
          </View>
        )}
        <View style={styles.body}>

          {(isAdmin || event.createdById === user?.id) && (
            <View style={styles.adminBar}>
              <TouchableOpacity style={styles.editBtn} onPress={() => router.push(`/admin/events/${id}/edit`)}>
                <Text style={styles.editBtnText}>{t('events.editEvent')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {(event as any).seriesTitle && (
            <View style={styles.seriesBadge}>
              <Text style={styles.seriesBadgeText}>
                📚 {(event as any).seriesTitle}{(event as any).partNumber ? ` #${(event as any).partNumber}` : ''}
              </Text>
            </View>
          )}

          <Text style={styles.title}>{title}</Text>
          {event.groupName && <Text style={styles.groupBadge}>👥 {event.groupName}</Text>}

          <View style={styles.metaBlock}>
            {(event as any).createdByEmail && (
              <Text style={styles.meta}>👤 {(event as any).createdByEmail}</Text>
            )}
            <Text style={styles.meta}>📅 {dateStr} ({event.timezone})</Text>
            {location ? (
              <TouchableOpacity onPress={() => {
                const q = encodeURIComponent(location);
                Linking.openURL(
                  Platform.OS === 'ios' ? `maps://q=${q}` : `geo:0,0?q=${q}`
                ).catch(() => Linking.openURL(`https://maps.google.com/?q=${q}`));
              }}>
                <Text style={[styles.meta, { textDecorationLine: 'underline' }]}>📍 {location}</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.meta}>💰 {fee}</Text>
          </View>

          {desc ? <Text style={styles.desc}>{desc}</Text> : null}

          <View style={styles.countsRow}>
            <Text style={styles.count}>✓ {event.rsvpCounts.GOING} {isPast ? (zh ? '出席' : 'Attended') : t('rsvp.going')}</Text>
            <Text style={styles.count}>✗ {event.rsvpCounts.NO} {isPast ? (zh ? '缺席' : 'Did Not Attend') : t('rsvp.notGoing')}</Text>
          </View>

          <View style={styles.rsvpRow}>
            {user && !isPast && rsvpBtn('GOING', t('rsvp.going'))}
            {user && !isPast && rsvpBtn('NO', t('rsvp.notGoing'))}
            <TouchableOpacity style={styles.rsvpBtn} onPress={loadGuests} disabled={guestsLoading}>
              <Text style={styles.rsvpBtnText}>{guestsLoading ? (zh ? '載入中…' : 'Loading…') : (zh ? '賓客名單' : 'Guest List')}</Text>
            </TouchableOpacity>
            {!isPast && user && (
              <TouchableOpacity style={[styles.rsvpBtn, styles.shareBtn]} onPress={handleCreateShareLink} disabled={inviteLoading}>
                <Text style={styles.shareBtnText}>{inviteLoading ? (zh ? '生成中…' : 'Generating…') : (zh ? '🔗 分享' : '🔗 Share')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {(isAdmin || event.createdById === user?.id) && (
            <View style={styles.blastSection}>
              <TouchableOpacity onPress={() => setShowBlast(!showBlast)} style={styles.blastToggle}>
                <Text style={styles.blastToggleText}>📣 {zh ? '發送訊息給出席者' : 'Message attendees'}</Text>
              </TouchableOpacity>
              {showBlast && (
                <View style={styles.blastForm}>
                  <Text style={styles.blastLabel}>{zh ? '發送方式' : 'Send via'}</Text>
                  <View style={styles.blastAudienceRow}>
                    {([['EMAIL', zh ? '✉️ Email' : '✉️ Email'], ['IN_APP', zh ? '🔔 站內通知' : '🔔 In-App']] as const).map(([ch, label]) => (
                      <TouchableOpacity key={ch}
                        onPress={() => setBlastChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch])}
                        style={[styles.audienceBtn, blastChannels.includes(ch) && styles.audienceBtnActive]}>
                        <Text style={[styles.audienceBtnText, blastChannels.includes(ch) && styles.audienceBtnTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.blastLabel}>{zh ? '發送對象' : 'Send to'}</Text>
                  <View style={styles.blastAudienceRow}>
                    {(['rsvped', 'invited'] as const).map((a) => (
                      <TouchableOpacity key={a} onPress={() => setBlastAudience(a)}
                        style={[styles.audienceBtn, blastAudience === a && styles.audienceBtnActive]}>
                        <Text style={[styles.audienceBtnText, blastAudience === a && styles.audienceBtnTextActive]}>
                          {a === 'rsvped' ? (zh ? '已回覆' : 'RSVPed') : (zh ? '已邀請' : 'Invited')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.blastInput}
                    placeholder={zh ? '輸入訊息…' : 'Enter message…'}
                    placeholderTextColor={colors.placeholder}
                    value={blastMsg}
                    onChangeText={setBlastMsg}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity
                    style={[styles.blastSendBtn, (blastSending || !blastMsg.trim() || blastChannels.length === 0) && { opacity: 0.5 }]}
                    onPress={handleBlastSend}
                    disabled={blastSending || !blastMsg.trim() || blastChannels.length === 0}
                  >
                    <Text style={styles.blastSendBtnText}>{blastSending ? (zh ? '發送中…' : 'Sending…') : (zh ? '立即發送' : 'Send Now')}</Text>
                  </TouchableOpacity>
                  {!!blastResult && (
                    <Text style={[styles.blastResult, { color: blastResult.startsWith('✓') ? '#16A34A' : '#EF4444' }]}>{blastResult}</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Comments section */}
          <Text style={styles.sectionTitle}>{t('comments.title')}</Text>
          {comments.length === 0 && <Text style={styles.empty}>{t('comments.noComments')}</Text>}
          {comments.map((c) => {
            const isOwn = user?.id === c.userId;
            const canDelete = isOwn || isAdmin;
            const isEditing = editingCommentId === c.id;
            return (
              <View key={c.id} style={styles.commentWrapper}>
                <View style={styles.comment}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentHandle}>{c.userHandle}</Text>
                    <View style={styles.commentActions}>
                      {isOwn && !isEditing && (
                        <TouchableOpacity
                          onPress={() => { setEditingCommentId(c.id); setEditCommentBody(c.body); }}
                          style={styles.commentActionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                        >
                          <Text style={styles.commentActionText}>{zh ? '編輯' : 'Edit'}</Text>
                        </TouchableOpacity>
                      )}
                      {canDelete && (
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(c.id)}
                          style={styles.commentActionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                        >
                          <Text style={[styles.commentActionText, { color: '#EF4444' }]}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {isEditing ? (
                    <View style={styles.editBlock}>
                      <TextInput
                        style={styles.editInput}
                        value={editCommentBody}
                        onChangeText={setEditCommentBody}
                        multiline
                        placeholderTextColor={colors.placeholder}
                        autoFocus
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity style={styles.editSaveBtn} onPress={() => handleEditComment(c.id)}>
                          <Text style={styles.editSaveBtnText}>{t('common.save')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.editCancelBtn}
                          onPress={() => { setEditingCommentId(null); setEditCommentBody(''); }}
                        >
                          <Text style={styles.editCancelBtnText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.commentBody}>{c.body}</Text>
                  )}

                  <View style={styles.commentFooter}>
                    <Text style={styles.commentDate}>{new Date(c.createdAt).toLocaleString()}</Text>
                    {user && (
                      <TouchableOpacity
                        onPress={() => setReplyingToId(replyingToId === c.id ? null : c.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.replyBtn}>
                          {replyingToId === c.id ? (zh ? '取消' : 'Cancel') : (zh ? '回覆' : 'Reply')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {replyingToId === c.id && user && (
                  <View style={styles.replyInputRow}>
                    <TextInput
                      style={styles.replyInput}
                      placeholder={zh ? '寫下回覆…' : 'Write a reply…'}
                      placeholderTextColor={colors.placeholder}
                      value={replyBody}
                      onChangeText={setReplyBody}
                      multiline
                      autoFocus
                    />
                    <TouchableOpacity style={styles.postReplyBtn} onPress={() => handleReply(c.id)}>
                      <Text style={styles.postBtnText}>{t('comments.post')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {c.replies && c.replies.length > 0 && (
                  <View style={styles.repliesSection}>
                    {c.replies.map((reply) => (
                      <View key={reply.id} style={styles.nestedReply}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.replyHandle}>{reply.userHandle}</Text>
                          {(user?.id === reply.userId || isAdmin) && (
                            <TouchableOpacity
                              onPress={() => handleDeleteComment(reply.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Text style={[styles.commentActionText, { color: '#EF4444' }]}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={styles.replyBody}>{reply.body}</Text>
                        <Text style={styles.replyDate}>{new Date(reply.createdAt).toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Modals */}
        <Modal visible={showInviteModal} transparent animationType="fade" onRequestClose={() => setShowInviteModal(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowInviteModal(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
              <Text style={styles.modalTitle}>{zh ? '活動分享連結' : 'Event Share Link'}</Text>
              <Text style={styles.inviteLinkText}>{inviteLink}</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleShareInvite}>
                  <Text style={styles.modalPrimaryBtnText}>{zh ? '分享' : 'Share'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowInviteModal(false)}>
                  <Text style={styles.modalSecondaryBtnText}>{zh ? '關閉' : 'Close'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showNoReason} transparent animationType="fade" onRequestClose={() => setShowNoReason(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowNoReason(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
              <Text style={styles.modalTitle}>{zh ? '無法參加的原因（選填）' : 'Reason for declining (optional)'}</Text>
              <TextInput
                style={[styles.editInput, { marginBottom: 16 }]}
                placeholder={zh ? '請輸入原因…' : 'Enter reason…'}
                placeholderTextColor={colors.placeholder}
                value={noReason}
                onChangeText={setNoReason}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleDeclineSubmit}>
                  <Text style={styles.modalPrimaryBtnText}>{zh ? '確認不參加' : 'Confirm Not Going'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowNoReason(false)}>
                  <Text style={styles.modalSecondaryBtnText}>{zh ? '取消' : 'Cancel'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showGuests} transparent animationType="slide" onRequestClose={() => setShowGuests(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowGuests(false)}>
            <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>{zh ? '出席名單' : 'Guest List'}</Text>
              <TextInput
                style={styles.guestSearch}
                value={guestSearch}
                onChangeText={setGuestSearch}
                placeholder={zh ? '搜尋…' : 'Search…'}
                placeholderTextColor={colors.placeholder}
                clearButtonMode="while-editing"
              />
              <View style={styles.guestTabRow}>
                {([
                  ['INVITED', zh ? '已邀請' : 'Invited', guests?.INVITED.length ?? 0],
                  ['GOING',   zh ? (isPast ? '出席' : '參加') : (isPast ? 'Attended' : 'Going'), guests?.GOING.length ?? 0],
                  ['NO',      zh ? (isPast ? '未出席' : '不參加') : (isPast ? "Didn't" : 'Not Going'), guests?.NO.length ?? 0],
                ] as [typeof activeGuestTab, string, number][]).map(([tab, label, count]) => (
                  <TouchableOpacity key={tab} onPress={() => setActiveGuestTab(tab)}
                    style={[styles.guestTab, activeGuestTab === tab && styles.guestTabActive]}>
                    <Text style={[styles.guestTabText, activeGuestTab === tab && styles.guestTabTextActive]}>
                      {label} ({count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <ScrollView style={{ marginTop: 8 }} keyboardShouldPersistTaps="handled">
                {(() => {
                  const term = guestSearch.trim().toLowerCase();
                  if (activeGuestTab === 'INVITED') {
                    const rows = (guests?.INVITED ?? []).filter((g) =>
                      !term || g.name.toLowerCase().includes(term) || (g.email ?? '').toLowerCase().includes(term)
                    );
                    return rows.length === 0
                      ? <Text style={styles.empty}>{term ? (zh ? '找不到符合結果' : 'No matches') : (zh ? '暫無受邀者' : 'No invitees yet')}</Text>
                      : rows.map((g, i) => (
                        <View key={i} style={styles.guestRow}>
                          <Text style={styles.guestName}>{g.name}</Text>
                          {g.email && <Text style={styles.guestHandle}>{g.email}</Text>}
                        </View>
                      ));
                  }
                  const rows = (guests?.[activeGuestTab] ?? []).filter((g) =>
                    !term || (g.displayName ?? '').toLowerCase().includes(term) || g.handle.toLowerCase().includes(term)
                  );
                  return rows.length === 0
                    ? <Text style={styles.empty}>{term ? (zh ? '找不到符合結果' : 'No matches') : (zh ? '暫無名單' : 'No one yet')}</Text>
                    : rows.map((g, i) => (
                      <View key={i} style={styles.guestRow}>
                        <Text style={styles.guestName}>{g.displayName || g.handle}</Text>
                        {g.handle && <Text style={styles.guestHandle}>{g.handle}</Text>}
                      </View>
                    ));
                })()}
              </ScrollView>
              <TouchableOpacity style={[styles.modalSecondaryBtn, { marginTop: 12 }]} onPress={() => setShowGuests(false)}>
                <Text style={styles.modalSecondaryBtnText}>{zh ? '關閉' : 'Close'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </ScrollView>

      {/* Sticky comment input bar — lives outside ScrollView so keyboard pushes it up */}
      {user && (
        <View style={[styles.inputBar, { paddingBottom: safeBottom > 0 ? safeBottom : 12 }]}>
          <TextInput
            style={styles.inputBarField}
            placeholder={t('comments.placeholder')}
            placeholderTextColor={colors.placeholder}
            value={commentBody}
            onChangeText={setCommentBody}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.inputBarSend, !commentBody.trim() && { opacity: 0.4 }]}
            onPress={handleComment}
            disabled={!commentBody.trim()}
          >
            <Text style={styles.inputBarSendText}>↑</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  kav: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { flex: 1, backgroundColor: colors.bg },
  coverWrapper: { width: '100%', height: 220 },
  cover: { width: '100%', height: 220 },
  body: { padding: 16 },
  adminBar: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  editBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  seriesBadge: { backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  seriesBadgeText: { color: '#4338CA', fontSize: 12, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  groupBadge: { fontSize: 12, color: INDIGO, fontWeight: '500', marginBottom: 8 },
  metaBlock: { gap: 5, marginBottom: 12 },
  meta: { fontSize: 14, color: colors.subtext },
  desc: { fontSize: 15, color: colors.text, marginTop: 4, marginBottom: 12, lineHeight: 22 },
  countsRow: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 4 },
  count: { fontSize: 13, color: colors.subtext },
  rsvpRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 4, flexWrap: 'wrap' },
  rsvpBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.card },
  rsvpBtnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  rsvpBtnText: { fontSize: 14, color: colors.text },
  rsvpBtnTextActive: { color: '#fff' },
  shareBtn: { backgroundColor: '#06B6D4', borderColor: '#06B6D4' },
  shareBtnText: { fontSize: 14, color: '#fff' },
  blastSection: { marginTop: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' },
  blastToggle: { padding: 14, backgroundColor: colors.card },
  blastToggleText: { fontSize: 14, fontWeight: '600', color: colors.text },
  blastForm: { padding: 14, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  blastLabel: { fontSize: 12, fontWeight: '600', color: colors.subtext, marginBottom: 8 },
  blastAudienceRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  audienceBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.card },
  audienceBtnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  audienceBtnText: { fontSize: 13, color: colors.text },
  audienceBtnTextActive: { color: '#fff' },
  blastInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 10, minHeight: 80, textAlignVertical: 'top', color: colors.inputText, backgroundColor: colors.input },
  blastSendBtn: { backgroundColor: INDIGO, borderRadius: 8, padding: 12, alignItems: 'center' },
  blastSendBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  blastResult: { marginTop: 8, fontSize: 13, textAlign: 'center' },

  // Comments
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 28, marginBottom: 16 },
  empty: { color: colors.placeholder, fontSize: 14, marginBottom: 8 },
  commentWrapper: { marginBottom: 14 },
  comment: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  commentHandle: { fontSize: 13, color: colors.subtext, fontWeight: '500' },
  commentActions: { flexDirection: 'row', gap: 12 },
  commentActionBtn: { padding: 2 },
  commentActionText: { fontSize: 13, color: INDIGO, fontWeight: '600' },
  commentBody: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 10 },
  commentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  commentDate: { fontSize: 11, color: colors.placeholder },
  replyBtn: { fontSize: 13, color: INDIGO, fontWeight: '600' },

  // Inline edit
  editBlock: { gap: 10, marginBottom: 8 },
  editInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 15, color: colors.inputText, backgroundColor: colors.input, minHeight: 72, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', gap: 8 },
  editSaveBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  editSaveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  editCancelBtn: { paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  editCancelBtnText: { color: colors.subtext, fontSize: 14 },

  // Replies
  replyInputRow: { flexDirection: 'row', gap: 8, marginTop: 6, marginLeft: 14 },
  replyInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: colors.input, color: colors.inputText },
  postReplyBtn: { backgroundColor: INDIGO, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  postBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  repliesSection: { marginTop: 4, marginLeft: 14, borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: 12 },
  nestedReply: { backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 8 },
  replyHandle: { fontSize: 12, color: colors.subtext, fontWeight: '600' },
  replyBody: { fontSize: 14, color: colors.text, marginVertical: 5, lineHeight: 20 },
  replyDate: { fontSize: 10, color: colors.placeholder },

  // Sticky input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  inputBarField: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: colors.inputText,
    backgroundColor: colors.input,
    maxHeight: 120,
  },
  inputBarSend: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: INDIGO,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  inputBarSendText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 20 },

  // Modals
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalContent: { backgroundColor: colors.card, borderRadius: 16, padding: 20, width: '90%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, elevation: 10 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 14, textAlign: 'center' },
  inviteLinkText: { fontSize: 12, color: INDIGO, backgroundColor: colors.input, borderRadius: 8, padding: 10, marginBottom: 14, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  modalPrimaryBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11, flex: 1 },
  modalPrimaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  modalSecondaryBtn: { backgroundColor: colors.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11, flex: 1 },
  modalSecondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: 14, textAlign: 'center' },
  guestSearch: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: colors.inputText, backgroundColor: colors.input, marginBottom: 10 },
  guestTabRow: { flexDirection: 'row', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  guestTab: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, alignItems: 'center', backgroundColor: colors.card },
  guestTabActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  guestTabText: { fontSize: 12, color: colors.text },
  guestTabTextActive: { color: '#fff', fontWeight: '600' },
  guestRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  guestName: { fontSize: 14, color: colors.text, fontWeight: '500' },
  guestHandle: { fontSize: 12, color: colors.subtext, marginTop: 2 },
});
