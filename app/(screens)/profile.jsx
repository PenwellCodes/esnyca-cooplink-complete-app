import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { userProfile } from '../../data/profile'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'

export default function ProfileScreen() {
  const { colors } = useTheme()

  // Dummy transactions data
  const transactions = [
    { id: '1', date: '2023-02-18', amount: 25.0, description: 'Order #1234' },
    { id: '2', date: '2023-02-19', amount: 40.0, description: 'Order #1235' },
    { id: '3', date: '2023-02-20', amount: 15.5, description: 'Order #1236' },
  ]

  // Dummy most bought products data
  const mostBoughtProducts = [
    {
      id: '1',
      name: 'Pepperoni Pizza',
      image:
        'https://img.freepik.com/free-psd/delicious-pepperoni-pizza-culinary-delight_632498-24206.jpg?t=st=1739921799~exp=1739925399~hmac=0d0936cf36822b4eb4de80cf882dbb34b69fb01505babd9dc08c38dee180adef&w=740',
    },
    {
      id: '2',
      name: 'Cheese Burger',
      image:
        'https://img.freepik.com/free-photo/still-life-delicious-american-hamburger_23-2149637312.jpg?t=st=1739921744~exp=1739925344~hmac=e5d8f284a41318523a2ff04bfaf1965e51aa9c06eca4da9fe3413042ba3824b7&w=740',
    },
    {
      id: '3',
      name: 'Fried Rice',
      image:
        'https://img.freepik.com/free-psd/delicious-pepperoni-pizza-culinary-delight_632498-24206.jpg?t=st=1739921799~exp=1739925399~hmac=0d0936cf36822b4eb4de80cf882dbb34b69fb01505babd9dc08c38dee180adef&w=740',
    },
  ]

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.divider,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View
          style={[styles.profileHeader, { backgroundColor: colors.surface }]}
        >
          <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
          <Text style={[styles.name, { color: colors.text }]}>
            {userProfile.name}
          </Text>
          <Text style={[styles.email, { color: colors.text }]}>
            {userProfile.email}
          </Text>
        </View>

        {/* Stats */}
        <View
          style={[styles.statsContainer, { backgroundColor: colors.surface }]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {userProfile.stats.totalOrders}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>
              Orders
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {new Date(userProfile.stats.memberSince).getFullYear()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>
              Member Since
            </Text>
          </View>
        </View>

        {/* Addresses Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Addresses
          </Text>
          {userProfile.addresses.map((address) => (
            <View
              key={address.id}
              style={[styles.addressCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.addressHeader}>
                <View style={styles.addressType}>
                  <Ionicons
                    name={
                      address.type === 'home'
                        ? 'home-outline'
                        : address.type === 'work'
                        ? 'business-outline'
                        : 'location-outline'
                    }
                    size={20}
                    color={colors.text}
                  />
                  <Text
                    style={[styles.addressTypeText, { color: colors.text }]}
                  >
                    {address.type}
                  </Text>
                </View>
                {address.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.addressText, { color: colors.text }]}>
                {address.street}, {address.city}, {address.state}{' '}
                {address.zipCode}
              </Text>
            </View>
          ))}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Preferences
          </Text>
          <View
            style={[
              styles.preferencesCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.preferenceItem}>
              <Text style={[styles.preferenceLabel, { color: colors.text }]}>
                Push Notifications
              </Text>
              <View
                style={[
                  styles.toggleButton,
                  userProfile.preferences.notifications &&
                    styles.toggleButtonActive,
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    userProfile.preferences.notifications &&
                      styles.toggleKnobActive,
                  ]}
                />
              </View>
            </View>
            <View style={styles.preferenceItem}>
              <Text style={[styles.preferenceLabel, { color: colors.text }]}>
                Email Updates
              </Text>
              <View
                style={[
                  styles.toggleButton,
                  userProfile.preferences.emailUpdates &&
                    styles.toggleButtonActive,
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    userProfile.preferences.emailUpdates &&
                      styles.toggleKnobActive,
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Transactions History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Transactions History
          </Text>
          {transactions.map((tx) => (
            <View
              key={tx.id}
              style={[
                styles.transactionCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.transactionRow}>
                <Text
                  style={[
                    styles.transactionDescription,
                    { color: colors.text },
                  ]}
                >
                  {tx.description}
                </Text>
                <Text
                  style={[styles.transactionAmount, { color: colors.primary }]}
                >
                  E{tx.amount.toFixed(2)}
                </Text>
              </View>
              <Text style={[styles.transactionDate, { color: colors.text }]}>
                {new Date(tx.date).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Most Bought Product */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Most Bought Product
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {mostBoughtProducts.map((product) => (
              <View
                key={product.id}
                style={[
                  styles.productCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImage}
                />
                <Text
                  style={[styles.productName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {product.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Log Out Button */}
        <Pressable
          style={[styles.logoutButton, { backgroundColor: colors.secondary }]}
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    marginTop: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 24,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 16,
  },
  addressCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressTypeText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  defaultBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    color: '#4CAF50',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    lineHeight: 20,
  },
  preferencesCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  preferenceLabel: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  toggleButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5E5',
    padding: 2,
  },
  toggleButtonActive: {
    backgroundColor: '#FF4B3E',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF',
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  transactionCard: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    marginTop: 4,
  },
  productCard: {
    width: 110,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    padding: 4,
  },
  logoutButton: {
    margin: 16,
    marginTop: 32,
    backgroundColor: '#F44336',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#00000',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
})
