import React from 'react';
import {
  TouchableOpacity,
  Image,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from '../types';

interface Props {
  item: MediaItem;
  index: number;
  onRemove: (id: string) => void;
  isActive?: boolean;
}

function formatDuration(seconds: number): string {
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MediaThumbnail({ item, index, onRemove, isActive }: Props) {
  return (
    <View style={[styles.container, isActive && styles.active]}>
      <Image
        source={{ uri: item.thumbnailUri ?? item.uri }}
        style={styles.image}
        resizeMode="cover"
      />

      {item.type === 'video' && (
        <View style={styles.videoBadge}>
          <Ionicons name="play" size={10} color="#fff" />
          {item.duration !== undefined && (
            <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
          )}
        </View>
      )}

      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{index + 1}</Text>
      </View>

      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close-circle" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  active: {
    borderColor: '#E1306C',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  indexBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  indexText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
});
