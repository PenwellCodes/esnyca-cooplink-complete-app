import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { useTheme, Card, Appbar, Chip } from "react-native-paper";
import { useRouter } from "expo-router";
import { images, typography } from "../../constants";
import { useLanguage } from "../../context/appstate/LanguageContext";
import { apiRequest } from "../../utils/api";

// Helper function to convert Firestore Timestamp to Date
const getDateFromTimestamp = (date) => {
  if (!date) return new Date();

  if (date instanceof Date) return date;

  // SQL/API date strings
  if (typeof date === "string" || typeof date === "number") {
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
};

// NewsItem component to handle individual card rendering and state
const NewsItem = ({ item, translations }) => {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useTheme();

  const formattedDate = getDateFromTimestamp(item.createdAt);

  return (
    <View style={styles.card}>
      <ImageBackground
        source={{ uri: item.imageUrl || "https://via.placeholder.com/400" }}
        style={styles.cardBackground}
        imageStyle={styles.cardBackgroundImage}
      >
        <View style={styles.cardOverlay} />
        <View style={styles.cardContent}>
          <Chip style={styles.chip}>
            {formattedDate.toLocaleDateString()}
          </Chip>
          <Text
            style={[
              styles.title,
              typography.robotoBold,
              { color: "#ffffff" },
            ]}
          >
            {item.title}
          </Text>
          {item.author && (
            <Text
              style={[
                styles.author,
                typography.robotoLight,
                { color: "#cde4ff" },
              ]}
            >
              {translations.byPrefix} {item.author}
            </Text>
          )}
          {item.summary && (
            <Text
              style={[
                styles.summary,
                typography.robotoLight,
                { color: "#f2f6ff" },
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
              { color: "#f9fbff" },
            ]}
          >
            {item.content}
          </Text>
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text style={[styles.readMore, { color: "#00AAFF" }]}>
              {expanded ? translations.showLess : translations.readMore}
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
};

const News = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { currentLanguage, t } = useLanguage();
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [translations, setTranslations] = useState({
    readMore: "Read More",
    showLess: "Show Less",
    byPrefix: "By",
  });

  useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        readMore: await t("Read More"),
        showLess: await t("Show Less"),
        byPrefix: await t("By"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        let newsListRaw = await apiRequest("/news?published=true");
        // Fallback: if no published news yet, display available news entries.
        if (!Array.isArray(newsListRaw) || newsListRaw.length === 0) {
          newsListRaw = await apiRequest("/news");
        }
        const newsList = (newsListRaw || []).map((item) => ({
          id: item.Id || item.id,
          title: item.Title || "",
          content: item.Content || "",
          summary: item.Summary || "",
          imageUrl: item.ImageUrl || "",
          author: item.Author || "",
          createdAt: item.CreatedAt || null,
          published: item.Published || false,
        }));
        
        // Additional sort as fallback (in case orderBy didn't work)
        const sortedNews = newsList.sort((a, b) => {
          const dateA = getDateFromTimestamp(a.createdAt);
          const dateB = getDateFromTimestamp(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Translate dynamic news body fields so cards fully follow language changes.
        const localizedNews = await Promise.all(
          sortedNews.map(async (item) => ({
            ...item,
            title: await t(item.title || ""),
            content: await t(item.content || ""),
            summary: await t(item.summary || ""),
            author: await t(item.author || ""),
          }))
        );

        setNewsData(localizedNews);
      } catch (error) {
        console.error("Error fetching news:", error);
        setNewsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [currentLanguage, t]);

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
        renderItem={({ item }) => (
          <NewsItem item={item} translations={translations} />
        )}
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
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardBackground: {
    width: "100%",
    minHeight: 220,
    justifyContent: "flex-end",
  },
  cardBackgroundImage: {
    borderRadius: 16,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  cardContent: {
    padding: 16,
  },
  chip: {
    alignSelf: "flex-start",
    marginBottom: 8,
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
