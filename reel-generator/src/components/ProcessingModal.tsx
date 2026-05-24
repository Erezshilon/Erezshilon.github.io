import React from 'react';
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { ProcessingProgress } from '../utils/ffmpegCommands';

interface Props {
  visible: boolean;
  progress: ProcessingProgress | null;
}

export default function ProcessingModal({ visible, progress }: Props) {
  const percent =
    progress && progress.total > 0
      ? Math.round(((progress.current) / (progress.total + 1)) * 100)
      : 0;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#E1306C" style={styles.spinner} />
          <Text style={styles.title}>יוצר ריל...</Text>
          <Text style={styles.step}>{progress?.step ?? 'מתחיל...'}</Text>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.percent}>{percent}%</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: 280,
    borderWidth: 1,
    borderColor: '#333',
  },
  spinner: {
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  step: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E1306C',
    borderRadius: 3,
  },
  percent: {
    color: '#E1306C',
    fontSize: 14,
    fontWeight: '600',
  },
});
