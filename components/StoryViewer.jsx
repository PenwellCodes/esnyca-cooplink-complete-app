import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { useAuth } from '../context/appstate/AuthContext';
import { useStories } from '../context/appstate/StoriesContext';

const { width } = Dimensions.get('window');
const STORY_DURATION = 5000;
const TAP_ZONE_WIDTH = width * 0.32;

const StoryViewer = ({
  stories: storiesProp = [],
  storyGroups: storyGroupsProp,
  initialGroupIndex = 0,
  initialStoryIndex = 0,
  isVisible,
  onClose,
  onReply,
  getOwnerName,
  getOwnerAvatar,
}) => {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { currentUser } = useAuth();
  const { deleteStory, recordView } = useStories();

  const groups =
    storyGroupsProp?.length > 0
      ? storyGroupsProp
      : storiesProp?.length > 0
      ? [{ userId: storiesProp[0]?.userId, stories: storiesProp }]
      : [];

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [replyText, setReplyText] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showDeleteOption, setShowDeleteOption] = useState(false);
  const [storyOwnerName, setStoryOwnerName] = useState('');
  const [loadingName, setLoadingName] = useState(false);
  const [ownerAvatar, setOwnerAvatar] = useState('');

  const groupIndexRef = useRef(groupIndex);
  const storyIndexRef = useRef(storyIndex);
  const groupsRef = useRef(groups);

  groupIndexRef.current = groupIndex;
  storyIndexRef.current = storyIndex;
  groupsRef.current = groups;

  const currentGroup = groups[groupIndex];
  const currentStories = currentGroup?.stories || [];
  const currentStory = currentStories[storyIndex];
  const currentUserId = currentStory?.userId;

  const canGoPrevious =
    storyIndex > 0 || groupIndex > 0;
  const canGoNext =
    storyIndex < currentStories.length - 1 || groupIndex < groups.length - 1;

  useEffect(() => {
    if (isVisible) {
      setGroupIndex(initialGroupIndex);
      setStoryIndex(initialStoryIndex);
      setIsPaused(false);
      setShowDeleteOption(false);
      setReplyText('');
    }
  }, [isVisible, initialGroupIndex, initialStoryIndex]);

  useEffect(() => {
    if (!currentUserId || !getOwnerName) {
      setStoryOwnerName('User');
      setOwnerAvatar('');
      setLoadingName(false);
      return;
    }

    if (String(currentUserId) === String(currentUser?.uid || currentUser?.id)) {
      setStoryOwnerName('You');
      setOwnerAvatar(currentUser?.profilePic || '');
      setLoadingName(false);
      return;
    }

    setLoadingName(true);
    const name = getOwnerName(currentUserId);
    const avatar = getOwnerAvatar ? getOwnerAvatar(currentUserId) : '';
    setStoryOwnerName(name || 'User');
    setOwnerAvatar(avatar || '');
    setLoadingName(false);
  }, [currentUserId, currentUser, getOwnerName, getOwnerAvatar]);

  const stopProgress = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    progressAnim.stopAnimation();
  }, [progressAnim]);

  const startProgress = useCallback(() => {
    if (!isVisible || isPaused || showDeleteOption) return;

    stopProgress();
    progressAnim.setValue(0);

    animationRef.current = Animated.timing(progressAnim, {
      toValue: width,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      if (!finished) return;
      const gi = groupIndexRef.current;
      const si = storyIndexRef.current;
      const grps = groupsRef.current;
      const list = grps[gi]?.stories || [];

      if (si < list.length - 1) {
        setStoryIndex(si + 1);
      } else if (gi < grps.length - 1) {
        setGroupIndex(gi + 1);
        setStoryIndex(0);
      } else {
        onClose();
        setGroupIndex(0);
        setStoryIndex(0);
      }
    });
  }, [isVisible, isPaused, showDeleteOption, progressAnim, onClose, stopProgress]);

  useEffect(() => {
    if (isVisible && currentStory) {
      startProgress();
    }
    return () => stopProgress();
  }, [groupIndex, storyIndex, isVisible, currentStory?.id, startProgress, stopProgress]);

  useEffect(() => {
    if (!isVisible || !currentStory?.id || !currentUser?.uid) return;
    if (currentStory.userId && currentStory.userId !== currentUser.uid) {
      recordView(currentStory.id, currentUser.uid);
    }
  }, [isVisible, currentStory?.id, currentUser?.uid, recordView]);

  const goToPrevious = useCallback(() => {
    stopProgress();
    setShowDeleteOption(false);
    const gi = groupIndexRef.current;
    const si = storyIndexRef.current;
    const grps = groupsRef.current;

    if (si > 0) {
      setStoryIndex(si - 1);
      return;
    }
    if (gi > 0) {
      const prevStories = grps[gi - 1]?.stories || [];
      setGroupIndex(gi - 1);
      setStoryIndex(Math.max(0, prevStories.length - 1));
    }
  }, [stopProgress]);

  const goToNext = useCallback(() => {
    stopProgress();
    setShowDeleteOption(false);
    const gi = groupIndexRef.current;
    const si = storyIndexRef.current;
    const grps = groupsRef.current;
    const list = grps[gi]?.stories || [];

    if (si < list.length - 1) {
      setStoryIndex(si + 1);
      return;
    }
    if (gi < grps.length - 1) {
      setGroupIndex(gi + 1);
      setStoryIndex(0);
      return;
    }
    onClose();
    setGroupIndex(0);
    setStoryIndex(0);
  }, [stopProgress, onClose]);

  const handleReply = () => {
    if (replyText.trim() && currentStory) {
      const replyData = {
        text: replyText.trim(),
        storyPreview: {
          imageURL: currentStory?.imageURL,
          caption: currentStory?.caption,
          storyId: currentStory?.id,
        },
      };

      onReply(currentStory, replyData);
      setReplyText('');
      setIsPaused(false);
      startProgress();
    }
  };

  const handleInputFocus = () => {
    setIsPaused(true);
    stopProgress();
  };

  const togglePause = () => {
    if (showDeleteOption) return;
    if (isPaused) {
      setIsPaused(false);
      startProgress();
    } else {
      setIsPaused(true);
      stopProgress();
    }
  };

  const handleLongPress = () => {
    if (currentStory?.userId === currentUser?.uid) {
      setShowDeleteOption(true);
      setIsPaused(true);
      stopProgress();
    }
  };

  const handleDeleteStory = async () => {
    try {
      await deleteStory(currentStory.id);
      Alert.alert('Success', 'Story deleted successfully');
      const remaining = currentStories.filter((s) => s.id !== currentStory.id);
      if (remaining.length === 0) {
        if (groupIndex < groups.length - 1) {
          setGroupIndex(groupIndex + 1);
          setStoryIndex(0);
        } else if (groupIndex > 0) {
          setGroupIndex(groupIndex - 1);
          setStoryIndex(0);
        } else {
          onClose();
        }
      } else if (storyIndex >= remaining.length) {
        setStoryIndex(remaining.length - 1);
      }
      setShowDeleteOption(false);
    } catch (error) {
      console.error('Error deleting story:', error);
      Alert.alert('Error', 'Failed to delete story');
    }
  };

  const getUserInitials = () => {
    if (storyOwnerName === 'You') return 'U';
    if (!storyOwnerName || storyOwnerName === 'User') return '?';
    const nameParts = storyOwnerName.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return storyOwnerName.substring(0, 2).toUpperCase();
  };

  if (!isVisible || !currentStory) {
    return null;
  }

  return (
    <Modal visible={isVisible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <View style={[styles.progressContainer, { top: insets.top + 10 }]}>
          {currentStories.map((_, index) => (
            <View key={index} style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      index === storyIndex
                        ? progressAnim
                        : index < storyIndex
                        ? '100%'
                        : 0,
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={[styles.headerContainer, { top: insets.top + 45 }]}>
          <View style={styles.userInfoContainer}>
            {loadingName ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                {ownerAvatar ? (
                  <Image source={{ uri: ownerAvatar }} style={styles.userAvatar} />
                ) : (
                  <View style={styles.userAvatarPlaceholder}>
                    <Text style={styles.userAvatarText}>{getUserInitials()}</Text>
                  </View>
                )}
                <Text style={styles.userName}>{storyOwnerName}</Text>
                {groups.length > 1 ? (
                  <Text style={styles.userCounter}>
                    {groupIndex + 1}/{groups.length}
                  </Text>
                ) : null}
              </>
            )}
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.contentWrapper}>
          <Pressable
            style={styles.tapZoneLeft}
            onPress={goToPrevious}
            disabled={!canGoPrevious}
          />
          <Pressable
            style={styles.tapZoneRight}
            onPress={goToNext}
          />

          <TouchableOpacity
            activeOpacity={1}
            onPress={togglePause}
            onLongPress={handleLongPress}
            delayLongPress={500}
            style={styles.contentContainer}
          >
            {currentStory?.imageURL ? (
              <Image
                source={{ uri: currentStory.imageURL }}
                style={styles.storyImage}
                resizeMode="contain"
              />
            ) : null}

            {currentStory?.caption ? (
              <View style={styles.captionContainer}>
                <Text style={styles.captionText}>{currentStory.caption}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {canGoPrevious ? (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={goToPrevious}
              accessibilityLabel="Previous story"
            >
              <Ionicons name="chevron-back" size={32} color="#fff" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.navButton, styles.navButtonRight]}
            onPress={goToNext}
            accessibilityLabel={canGoNext ? 'Next story' : 'Close'}
          >
            <Ionicons
              name={canGoNext ? 'chevron-forward' : 'close'}
              size={32}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {showDeleteOption ? (
          <View style={styles.deleteOptionContainer}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteStory}>
              <Text style={styles.deleteButtonText}>Delete Story</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowDeleteOption(false);
                setIsPaused(false);
                startProgress();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {currentStory?.userId !== currentUser?.uid ? (
          <View
            style={[
              styles.replyContainer,
              {
                bottom: keyboardHeight + Math.max(insets.bottom, 20),
              },
            ]}
          >
            <TextInput
              style={styles.replyInput}
              placeholder={`Reply to ${
                storyOwnerName === 'You' ? 'this story' : storyOwnerName
              }...`}
              placeholderTextColor="#999"
              value={replyText}
              onChangeText={setReplyText}
              onFocus={handleInputFocus}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleReply}>
              <Ionicons name="send" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 10,
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
  headerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    zIndex: 20,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 25,
    maxWidth: '75%',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  userAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  userCounter: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginLeft: 6,
  },
  closeButton: {
    padding: 8,
  },
  contentWrapper: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  tapZoneLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: TAP_ZONE_WIDTH,
    zIndex: 5,
  },
  tapZoneRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: TAP_ZONE_WIDTH,
    zIndex: 5,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  navButtonLeft: {
    left: 12,
  },
  navButtonRight: {
    right: 12,
  },
  storyImage: {
    flex: 1,
    width: '100%',
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
    position: 'absolute',
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.92)',
    borderRadius: 25,
    zIndex: 20,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: 'white',
    marginRight: 10,
  },
  sendButton: {
    padding: 8,
  },
  deleteOptionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  deleteButton: {
    backgroundColor: 'red',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    width: 150,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'gray',
    padding: 12,
    borderRadius: 8,
    width: 150,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StoryViewer;
