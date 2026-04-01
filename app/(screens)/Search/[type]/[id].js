// app/search/[type]/[id].js
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase/firebaseConfig";
import { useLanguage } from "../../../../context/appstate/LanguageContext";

// Map the type from the URL to the Firebase collection name
const typeToCollectionMap = {
    user: "users",
    news: "news",
    service: "services",
    cooperative: "cooperatives",
    partnership: "partnerships",
};

const SearchDetail = () => {
    // Get route parameters using useLocalSearchParams
    const { type, id } = useLocalSearchParams();
    const { currentLanguage, t } = useLanguage();
    const [itemData, setItemData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [translations, setTranslations] = useState({
        loadingDetails: "Loading details...",
        itemNotFound: "Item not found",
        details: "Details",
    });

    useEffect(() => {
        const loadTranslations = async () => {
            setTranslations({
                loadingDetails: await t("Loading details..."),
                itemNotFound: await t("Item not found"),
                details: await t("Details"),
            });
        };
        loadTranslations();
    }, [currentLanguage, t]);

    useEffect(() => {
        const fetchData = async () => {
            const collectionName = typeToCollectionMap[type];
            if (!collectionName) {
                console.error("Unknown type:", type);
                setLoading(false);
                return;
            }
            try {
                const docRef = doc(db, collectionName, id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setItemData(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id && type) {
            fetchData();
        }
    }, [id, type]);

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>{translations.loadingDetails}</Text>
            </View>
        );
    }

    if (!itemData) {
        return (
            <View style={styles.container}>
                <Text>{translations.itemNotFound}</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>
                {itemData.name || itemData.title || itemData.headline || translations.details}
            </Text>
            <Text style={styles.content}>{JSON.stringify(itemData, null, 2)}</Text>
        </ScrollView>
    );
};

export default SearchDetail;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
    },
    content: {
        fontSize: 16,
    },
});
