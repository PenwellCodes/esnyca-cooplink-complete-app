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
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { useRouter } from "expo-router";
import { images, typography } from "../../constants";

// Helper function to convert Firestore Timestamp to Date
const getDateFromTimestamp = (date) => {
  if (!date) return new Date();
  
  // If it's a Firestore Timestamp object
  if (date instanceof Timestamp) {
    return date.toDate();
  }
  
  // If it has seconds property (Timestamp-like object)
  if (date.seconds) {
    return new Date(date.seconds * 1000);
  }
  
  // If it's already a Date object
  if (date instanceof Date) {
    return date;
  }
  
  // Fallback to current date
  return new Date();
};

// NewsItem component to handle individual card rendering and state
const NewsItem = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useTheme();

  const formattedDate = getDateFromTimestamp(item.createdAt);

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Image container with overlay chip */}
      <View style={styles.imageContainer}>
        <Card.Cover source={{ uri: item.imageUrl || "https://via.placeholder.com/400" }} />
        <Chip style={styles.chip}>
          {formattedDate.toLocaleDateString()}
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
        {item.author && (
          <Text
            style={[
              styles.author,
              typography.robotoLight,
              { color: colors.primary },
            ]}
          >
            By {item.author}
          </Text>
        )}
        {item.summary && (
          <Text
            style={[
              styles.summary,
              typography.robotoLight,
              { color: colors.tertiary },
            ]}
          >
            {item.summary}
          </Text>
        )}
        <Text
          numberOfLines={expanded ? undefined : 3}
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
        // Query news collection ordered by createdAt (newest first)
        // Filter for published items in JavaScript to avoid composite index requirement
        const newsQuery = query(
          collection(db, "news"),
          orderBy("createdAt", "desc")
        );
        const newsSnapshot = await getDocs(newsQuery);
        
        const newsList = newsSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || "",
              content: data.content || "",
              summary: data.summary || "",
              imageUrl: data.imageUrl || "",
              author: data.author || "",
              createdAt: data.createdAt || null,
              published: data.published || false,
            };
          })
          .filter((item) => item.published === true); // Filter only published news
        
        // Additional sort as fallback (in case orderBy didn't work)
        const sortedNews = newsList.sort((a, b) => {
          const dateA = getDateFromTimestamp(a.createdAt);
          const dateB = getDateFromTimestamp(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        setNewsData(sortedNews);
      } catch (error) {
        console.error("Error fetching news:", error);
        setNewsData([]);
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
    marginBottom: 4,
  },
  author: {
    fontSize: 14,
    marginBottom: 8,
    fontStyle: "italic",
  },
  summary: {
    fontSize: 15,
    marginBottom: 8,
    fontWeight: "500",
  },
  content: {
    fontSize: 16,
    marginTop: 4,
  },
  readMore: {
    marginTop: 8,
    fontSize: 16,
  },
});
