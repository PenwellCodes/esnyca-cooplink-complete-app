import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  SectionList,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { useTheme, Badge, TextInput } from 'react-native-paper'
import { Link } from 'expo-router'
import { images } from '../../constants'
import { SafeAreaView } from 'react-native-safe-area-context'

const sections = [
  {
    title: 'Best Selling',
    data: [
      {
        id: 1,
        name: 'Golden Spicy Chicken',
        description: 'Indulge in our succulent G...',
        price: 40.0,
        image:
          'https://img.freepik.com/free-photo/crispy-chicken-drumsticks-grilled-kfc-style-with-crackers_114579-733.jpg?t=st=1739921670~exp=1739925270~hmac=82f86bd75b6cef8ab2ec81da5002f543b524d136c650f24342c5900d6ba19ae8&w=996',
      },
      {
        id: 2,
        name: 'Cheese Burger Nagi',
        description: 'Burger with patty filled wit...',
        price: 35.50,
        image:
          'https://img.freepik.com/free-photo/still-life-delicious-american-hamburger_23-2149637312.jpg?t=st=1739921744~exp=1739925344~hmac=e5d8f284a41318523a2ff04bfaf1965e51aa9c06eca4da9fe3413042ba3824b7&w=740',
      },
    ],
  },
  {
    title: 'Recommended for You',
    data: [
      {
        id: 3,
        name: 'Pepperoni Pizza',
        description: 'Hot and cheesy pepperoni...',
        price: 140.99,
        image:
          'https://img.freepik.com/free-psd/delicious-pepperoni-pizza-culinary-delight_632498-24206.jpg?t=st=1739921799~exp=1739925399~hmac=0d0936cf36822b4eb4de80cf882dbb34b69fb01505babd9dc08c38dee180adef&w=740',
      },
      {
        id: 4,
        name: 'Sushi Platter',
        description: 'Fresh sushi selection...',
        price: 160.00,
        image:
          'https://img.freepik.com/free-psd/delicious-sushi-platter-assorted-rolls-nigiri-japanese-food_632498-50467.jpg?t=st=1739921852~exp=1739925452~hmac=6c4b2660df430994a40a900ae7b74fc0fc4e4cd2744f73334653b4dd52985284&w=740',
      },
    ],
  },
  {
    title: 'All Products',
    data: [
      {
        id: 7,
        name: 'Steak Deluxe',
        description: 'Juicy steak with sides...',
        price: 200.00,
        image:
          'https://img.freepik.com/free-psd/delicious-grilled-ribeye-steak-with-herb-butter_191095-85744.jpg?t=st=1739921921~exp=1739925521~hmac=8f0b0ba2f681ad7b6acac84eb2d7f73545f8c37312b90597d8365c81c75df1ff&w=740',
      },
      {
        id: 8,
        name: 'Pasta Carbonara',
        description: 'Creamy and delicious...',
        price: 80.50,
        image:
          'https://img.freepik.com/free-photo/spaghetti-bolognese-with-cheese_1253-1606.jpg?t=st=1739921969~exp=1739925569~hmac=05f2c809bf620c0d7ebb8cd66a7ef9228f8be257fb4dea882454515891fd3310&w=996',
      },
    ],
  },
]

export default function StoreScreen() {
  const { colors } = useTheme()

  const renderProduct = ({ item }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        <Text
          style={[styles.description, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={[styles.price, { color: colors.primary }]}>
            E{item.price.toFixed(2)}
          </Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name='add' size={20} color='#FFF' />
          </Pressable>
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name='menu' size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.locationContainer}>
          <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>
            Location
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name='location-sharp' size={16} color='red' />
            <Text style={[styles.locationText, { color: colors.text }]}>
              Manzini new village
            </Text>
          </View>
        </View>

        <Link href='/cart' style={styles.iconButton} asChild>
          <TouchableOpacity>
            <Badge style={styles.badge}>41</Badge>
            <Feather name='shopping-cart' size={24} color={colors.text} />
          </TouchableOpacity>
        </Link>
      </View>
      

      {/* Promotional Banner */}
      <View style={styles.bannerContainer}>
        <Image
          source={images.Banner2}
          style={styles.bannerImage}
          resizeMode='cover'
        />
      </View>
     
      {/* Product Sections */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProduct}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {title}
          </Text>
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    marginHorizontal: 16,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#000',
    paddingVertical: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
    elevation: 2,
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  iconButton: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  locationContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  locationLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 1,
  },
  bannerContainer: {
    paddingHorizontal: 16,
    marginVertical: 16,
    height: 160,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    fontFamily: 'Poppins-Bold',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  description: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 4,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
})
