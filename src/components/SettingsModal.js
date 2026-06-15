import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { storageService } from '../services/storageService';

export default function SettingsModal({ visible, onClose, onApiKeyChange }) {
  const [apiKey, setApiKey] = useState('');
  const [lastAnalysis, setLastAnalysis] = useState(null);

  useEffect(() => {
    if (visible) {
      storageService.getApiKey().then(k => setApiKey(k || ''));
      storageService.getLastAnalysis().then(d => setLastAnalysis(d));
    }
  }, [visible]);

  const handleSave = async () => {
    await storageService.saveApiKey(apiKey.trim());
    onApiKeyChange(apiKey.trim());
    onClose();
  };

  const getLastAnalysisText = () => {
    if (!lastAnalysis) return null;
    const secs = Math.round((Date.now() - lastAnalysis.timestamp) / 1000);
    const timeStr = secs < 60 ? `${secs} сек назад` : `${Math.round(secs / 60)} мин назад`;
    return `Последний анализ: ${lastAnalysis.profile} • ${timeStr}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.wrapper}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Настройки</Text>

          <Text style={styles.label}>Anthropic API ключ</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-ant-..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            secureTextEntry
            autoCapitalize="none"
          />

          {getLastAnalysisText() && (
            <Text style={styles.status}>{getLastAnalysisText()}</Text>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontStyle: 'italic',
    fontWeight: '200',
    marginBottom: 24,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 12,
  },
  status: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
