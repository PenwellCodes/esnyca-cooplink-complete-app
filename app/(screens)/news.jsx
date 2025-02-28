import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useTheme, Card, Appbar, Chip } from "react-native-paper";
import { db } from "../../firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "expo-router";
import { images, typography } from "../../constants";

// NewsItem component to handle individual card rendering and state
const NewsItem = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useTheme();

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Image container with overlay chip */}
      <View style={styles.imageContainer}>
        <Card.Cover source={{ uri: item.imageUrl }} />
        <Chip style={styles.chip}>
          {new Date(item.date.seconds * 1000).toLocaleDateString()}
        </Chip>
      </View>
      <Card.Content>
        <Text
          style={[
            styles.title,
            typography.robotoBold,
            { color: colors.tertiary },
          ]}
        >
          {item.title}
        </Text>
        <Text
          numberOfLines={expanded ? undefined : 2}
          ellipsizeMode="tail"
          style={[
            styles.content,
            typography.robotoLight,
            { color: colors.tertiary },
          ]}
        >
          {item.content}
        </Text>
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text style={[styles.readMore, { color: colors.primary }]}>
            {expanded ? "Show Less" : "Read More"}
          </Text>
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );
};

const News = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const newsCollection = collection(db, "news");
        const newsSnapshot = await getDocs(newsCollection);
        const newsList = newsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNewsData(newsList);
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Image source={images.loader} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      <FlatList
        data={newsData}
        renderItem={({ item }) => <NewsItem item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

export default News;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    width: 50,
    height: 50,
  },
  list: {
    padding: 10,
  },
  card: {
    marginBottom: 20, // Increased spacing below each card
  },
  imageContainer: {
    position: "relative", // Allows absolute positioning of chip
  },
  chip: {
    position: "absolute",
    top: 10,
      left: 10,
  },
  title: {
    fontSize: 18,
  },
  content: {
    fontSize: 16,
  },
  readMore: {
    marginTop: 5,
    fontSize: 16,
  },
});
