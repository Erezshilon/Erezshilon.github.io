import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getVideoThumbnailAsync } from 'expo-video-thumbnails';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import MediaThumbnail from '../components/MediaThumbnail';
import ProcessingModal from '../components/ProcessingModal';
import { useReelProcessor } from '../hooks/useReelProcessor';
import { MediaItem, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const { status, progress, outputUri, error, process, reset } = useReelProcessor();

  const pickMedia = useCallback(async () => {
    const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'אנא אפשר גישה לגלריה בהגדרות.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 1,
      videoMaxDuration: 60,
      selectionLimit: 20,
    });

    if (result.canceled || !result.assets) return;

    const newItems: MediaItem[] = await Promise.all(
      result.assets.map(async (asset) => {
        let thumbnailUri: string | undefined;

        if (asset.type === 'video' && asset.uri) {
          try {
            const thumb = await getVideoThumbnailAsync(asset.uri, { time: 0 });
            thumbnailUri = thumb.uri;
          } catch {
            thumbnailUri = undefined;
          }
        }

        return {
          id: `${Date.now()}-${Math.random()}`,
          uri: asset.uri,
          type: (asset.type === 'video' ? 'video' : 'image') as 'image' | 'video',
          duration: asset.duration ? asset.duration / 1000 : undefined,
          width: asset.width,
          height: asset.height,
          thumbnailUri,
        };
      })
    );

    setMediaItems((prev) => [...prev, ...newItems]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const generateReel = useCallback(async () => {
    if (mediaItems.length < 1) {
      Alert.alert('אין מדיה', 'בחר לפחות תמונה או סרטון אחד.');
      return;
    }
    await process(mediaItems);
  }, [mediaItems, process]);

  // Navigate to preview when done
  React.useEffect(() => {
    if (status === 'done' && outputUri) {
      navigation.navigate('Preview', { outputUri });
      reset();
    }
  }, [status, outputUri, navigation, reset]);

  React.useEffect(() => {
    if (status === 'error' && error) {
      Alert.alert('שגיאה', error);
      reset();
    }
  }, [status, error, reset]);

  const isEmpty = mediaItems.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>יצירת ריל</Text>
        <Text style={styles.headerSubtitle}>
          {isEmpty ? 'בחר תמונות וסרטונים' : `${mediaItems.length} פריטים נבחרו`}
        </Text>
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <Ionicons name="film-outline" size={80} color="#333" />
          <Text style={styles.emptyTitle}>הגלריה שלך ריקה</Text>
          <Text style={styles.emptySubtitle}>הוסף תמונות וסרטונים ליצירת ריל</Text>
        </View>
      ) : (
        <FlatList
          data={mediaItems}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }) => (
            <MediaThumbnail
              item={item}
              index={index}
              onRemove={removeItem}
            />
          )}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.addBtn} onPress={pickMedia}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addBtnText}>הוסף מדיה</Text>
        </TouchableOpacity>

        {!isEmpty && (
          <TouchableOpacity style={styles.generateBtn} onPress={generateReel}>
            <Ionicons name="play-circle" size={24} color="#fff" />
            <Text style={styles.generateBtnText}>צור ריל</Text>
          </TouchableOpacity>
        )}
      </View>

      <ProcessingModal
        visible={status === 'processing'}
        progress={progress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    color: '#555',
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#444',
    fontSize: 14,
  },
  grid: {
    padding: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  generateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1306C',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
