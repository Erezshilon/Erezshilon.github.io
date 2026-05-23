import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type PreviewRoute = RouteProp<RootStackParamList, 'Preview'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_HEIGHT = SCREEN_WIDTH * (16 / 9);

export default function PreviewScreen() {
  const route = useRoute<PreviewRoute>();
  const navigation = useNavigation();
  const { outputUri } = route.params;

  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis / 1000);
    setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);

    if (status.didJustFinish) {
      videoRef.current?.replayAsync();
    }
  }, []);

  const togglePlayback = useCallback(async () => {
    if (isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      await videoRef.current?.playAsync();
    }
  }, [isPlaying]);

  const saveToGallery = useCallback(async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'אפשר גישה לגלריה בהגדרות.');
      return;
    }

    setIsSaving(true);
    try {
      await MediaLibrary.saveToLibraryAsync(outputUri);
      Alert.alert('נשמר!', 'הריל נשמר בהצלחה לגלריה שלך.');
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור את הריל.');
    } finally {
      setIsSaving(false);
    }
  }, [outputUri]);

  const shareReel = useCallback(async () => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('שיתוף לא זמין', 'שיתוף לא נתמך במכשיר זה.');
      return;
    }
    await Sharing.shareAsync(outputUri, {
      mimeType: 'video/mp4',
      dialogTitle: 'שתף את הריל שלך',
    });
  }, [outputUri]);

  const formatTime = (seconds: number) => {
    const s = Math.floor(seconds % 60);
    const m = Math.floor(seconds / 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.videoWrapper}>
        <Video
          ref={videoRef}
          source={{ uri: outputUri }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          shouldPlay
          isLooping
        />

        <TouchableOpacity style={styles.playOverlay} onPress={togglePlayback}>
          {!isPlaying && (
            <View style={styles.playBtn}>
              <Ionicons name="play" size={40} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.timeOverlay}>
          <Text style={styles.timeText}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>הריל שלך מוכן!</Text>
        <Text style={styles.infoSubtitle}>
          {duration > 0 ? `משך: ${formatTime(duration)}` : 'טוען...'}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={shareReel}>
          <View style={[styles.actionIcon, { backgroundColor: '#833AB4' }]}>
            <Ionicons name="logo-instagram" size={24} color="#fff" />
          </View>
          <Text style={styles.actionLabel}>שתף לאינסטגרם</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={saveToGallery} disabled={isSaving}>
          <View style={[styles.actionIcon, { backgroundColor: '#0095F6' }]}>
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="download" size={24} color="#fff" />
            )}
          </View>
          <Text style={styles.actionLabel}>שמור לגלריה</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={shareReel}>
          <View style={[styles.actionIcon, { backgroundColor: '#25D366' }]}>
            <Ionicons name="share-social" size={24} color="#fff" />
          </View>
          <Text style={styles.actionLabel}>שתף</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.newReelBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="add-circle-outline" size={20} color="#E1306C" />
        <Text style={styles.newReelBtnText}>צור ריל חדש</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoWrapper: {
    width: SCREEN_WIDTH,
    height: PREVIEW_HEIGHT,
    backgroundColor: '#111',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  timeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#222',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E1306C',
  },
  info: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  infoTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  infoSubtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  newReelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1306C',
  },
  newReelBtnText: {
    color: '#E1306C',
    fontSize: 16,
    fontWeight: '600',
  },
});
