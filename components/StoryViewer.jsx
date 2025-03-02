import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const STORY_DURATION = 5000;

const StoryViewer = ({ stories, isVisible, onClose, onReply, userName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isVisible) {
      startProgress();
    }
    return () => {
      progressAnim.setValue(0);
    };
  }, [currentIndex, isVisible]);

  const startProgress = () => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: width,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          onClose();
          setCurrentIndex(0);
        }
      }
    });
  };

  const handleReply = () => {
    if (replyText.trim()) {
      // Get current story data
      const currentStory = stories[currentIndex];
      const replyData = {
        text: replyText.trim(),
        storyPreview: {
          imageURL: currentStory?.imageURL,
          caption: currentStory?.caption,
          storyId: currentStory?.id
        }
      };
      
      onReply(stories[currentIndex], replyData);
      setReplyText('');
      startProgress();
    }
  };

  const handleInputFocus = () => {
    setIsPaused(true);
    progressAnim.stopAnimation();
  };

  const handleInputBlur = () => {
    // Don't resume automatically on blur, let the send action handle it
    // This prevents auto-resume when user is still typing
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      progressAnim.stopAnimation();
    } else {
      startProgress();
    }
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent={false}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: index === currentIndex 
                      ? progressAnim 
                      : index < currentIndex 
                        ? '100%' 
                        : 0
                  }
                ]}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>

        <View style={styles.contentWrapper}>
          <TouchableOpacity 
            activeOpacity={1}
            onPress={togglePause}
            style={styles.contentContainer}
          >
            {stories[currentIndex]?.imageURL ? (
              <Image
                source={{ uri: stories[currentIndex].imageURL }}
                style={styles.storyImage}
                resizeMode="contain"
              />
            ) : null}
            
            {stories[currentIndex]?.caption && (
              <View style={styles.captionContainer}>
                <Text style={styles.captionText}>
                  {stories[currentIndex].caption}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.userName}>
            {userName?.length > 8 ? `${userName.substring(0, 8)}...` : userName}
          </Text>
        </View>

        <View style={styles.replyContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder="Reply to story..."
            placeholderTextColor="#999"
            value={replyText}
            onChangeText={setReplyText}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleReply}
          >
            <Ionicons name="send" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    zIndex: 1,
  },
  progressBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
  },
  storyImage: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 15,
    paddingTop: 40,
  },
  userName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  captionContainer: {
    position: 'absolute',
    bottom: '20%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
    borderRadius: 10,
  },
  captionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    color: 'white',
    marginRight: 10,
  },
  sendButton: {
    padding: 8,
  },
});

export default StoryViewer;
