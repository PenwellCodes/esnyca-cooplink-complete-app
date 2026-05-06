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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { useAuth } from '../context/appstate/AuthContext';
import { useStories } from '../context/appstate/StoriesContext';

const { width } = Dimensions.get('window');
const STORY_DURATION = 5000;

const StoryViewer = ({ stories, isVisible, onClose, onReply }) => {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { currentUser } = useAuth();
  const { deleteStory, recordView } = useStories();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [isPaused, setIsPaused] = useState(false);
  const [showDeleteOption, setShowDeleteOption] = useState(false);
  const [storyOwnerName, setStoryOwnerName] = useState('');
  const [loadingName, setLoadingName] = useState(false);
  const [ownerAvatar, setOwnerAvatar] = useState('');

  const currentStory = stories[currentIndex];

  // Fetch story owner name and avatar when story changes
  useEffect(() => {
    const fetchOwnerInfo = async () => {
      if (!currentStory) return;
      
      if (currentStory.userId === currentUser?.uid) {
        setStoryOwnerName('You');
        setOwnerAvatar(currentUser?.profilePic || '');
        return;
      }
      
      setLoadingName(true);
      try {
        // Fetch all users to find the name and avatar
        const response = await fetch('http://207.180.254.163:4000/api/users');
        if (response.ok) {
          const allUsers = await response.json();
          const foundUser = allUsers.find(u => 
            u.Id === currentStory.userId || 
            u.id === currentStory.userId || 
            u.uid === currentStory.userId ||
            u.userId === currentStory.userId
          );
          
          if (foundUser) {
            const userName = foundUser.displayName || foundUser.name || foundUser.fullName || foundUser.username || foundUser.userName || foundUser.DisplayName;
            const userAvatar = foundUser.profilePic || foundUser.avatar || foundUser.profilePicture || foundUser.imageUrl;
            setStoryOwnerName(userName || 'User');
            setOwnerAvatar(userAvatar || '');
          } else {
            const shortId = currentStory.userId.substring(0, 6);
            setStoryOwnerName(`User ${shortId}`);
            setOwnerAvatar('');
          }
        } else {
          const shortId = currentStory.userId.substring(0, 6);
          setStoryOwnerName(`User ${shortId}`);
          setOwnerAvatar('');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        const shortId = currentStory.userId.substring(0, 6);
        setStoryOwnerName(`User ${shortId}`);
        setOwnerAvatar('');
      } finally {
        setLoadingName(false);
      }
    };
    
    fetchOwnerInfo();
  }, [currentStory, currentUser]);

  useEffect(() => {
    if (isVisible) {
      startProgress();
    }
    return () => {
      progressAnim.setValue(0);
    };
  }, [currentIndex, isVisible]);

  useEffect(() => {
    if (!isVisible || !stories?.length || !currentUser?.uid) return;
    const s = stories[currentIndex];
    if (s?.id && s.userId && s.userId !== currentUser.uid) {
      recordView(s.id, currentUser.uid);
    }
  }, [isVisible, currentIndex, stories, currentUser?.uid, recordView]);

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
      const replyData = {
        text: replyText.trim(),
        storyPreview: {
          imageURL: currentStory?.imageURL,
          caption: currentStory?.caption,
          storyId: currentStory?.id
        }
      };
      
      onReply(currentStory, replyData);
      setReplyText('');
      startProgress();
    }
  };

  const handleInputFocus = () => {
    setIsPaused(true);
    progressAnim.stopAnimation();
  };

  const handleInputBlur = () => {};

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      progressAnim.stopAnimation();
    } else {
      startProgress();
    }
  };

  const handleLongPress = () => {
    if (currentStory?.userId === currentUser?.uid) {
      setShowDeleteOption(true);
      setIsPaused(true);
      progressAnim.stopAnimation();
    }
  };

  const handleDeleteStory = async () => {
    try {
      await deleteStory(currentStory.id);
      Alert.alert("Success", "Story deleted successfully");
      onClose();
    } catch (error) {
      console.error("Error deleting story:", error);
      Alert.alert("Error", "Failed to delete story");
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

  return (
    <Modal visible={isVisible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        {/* Progress bars at the very top */}
        <View style={[styles.progressContainer, { top: insets.top + 10 }]}>
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

        {/* Header with user info and close button */}
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
              </>
            )}
          </View>
          
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Story Content */}
        <View style={styles.contentWrapper}>
          <TouchableOpacity 
            activeOpacity={1}
            onPress={togglePause}
            onLongPress={handleLongPress}
            style={styles.contentContainer}
          >
            {currentStory?.imageURL ? (
              <Image
                source={{ uri: currentStory.imageURL }}
                style={styles.storyImage}
                resizeMode="contain"
              />
            ) : null}
            
            {currentStory?.caption && (
              <View style={styles.captionContainer}>
                <Text style={styles.captionText}>
                  {currentStory.caption}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {showDeleteOption && (
          <View style={styles.deleteOptionContainer}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteStory}>
              <Text style={styles.deleteButtonText}>Delete Story</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowDeleteOption(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reply Container - Only show if user is not the story owner */}
        {currentStory?.userId !== currentUser?.uid && (
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
              placeholder={`Reply to ${storyOwnerName === 'You' ? 'this story' : storyOwnerName}...`}
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
        )}
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