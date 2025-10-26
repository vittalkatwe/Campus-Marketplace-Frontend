"use client"

import { Image } from "expo-image"
import { StyleSheet, View, TouchableOpacity, SafeAreaView, FlatList, ScrollView, RefreshControl, Alert } from "react-native"
import { useFonts } from "expo-font"
import * as SplashScreen from "expo-splash-screen"
import { useEffect, useState } from "react"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { Ionicons } from "@expo/vector-icons"
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from "@expo-google-fonts/outfit"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "expo-router"

SplashScreen.preventAutoHideAsync()

// Define interfaces for our data
interface Item {
  id: number
  title: string
  description: string
  price: number
  image: string
  category: string
  seller: string
  sellerName: string
  status: boolean
  views: number
  quantity: number
  createdAt: string
}

interface ItemDto {
  title: string
  description: string
  price: number
  quantity: number
  category: string
  imageUrl: string
}

// Update this to match your backend URL
const API_BASE_URL = "http://localhost:8080" // Change this to your actual backend URL

function HomeScreen({ onProductPress }: { onProductPress: (product: Item) => void }) {
  const [fontsLoaded] = useFonts({
    "Outfit-Regular": Outfit_400Regular,
    "Outfit-Medium": Outfit_500Medium,
    "Outfit-SemiBold": Outfit_600SemiBold,
    "Outfit-Bold": Outfit_700Bold,
  })

  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const { token, userEmail } = useAuth()

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
      fetchItems()
    }
  }, [fontsLoaded, token])

  const fetchItems = async () => {
    try {
      setLoading(true)
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/api/items`, {
        method: 'GET',
        headers: headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.status}`)
      }
      
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Error fetching items:', error)
      Alert.alert('Error', 'Failed to load items. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!fontsLoaded) {
    return null
  }

  const renderProductItem = ({ item }: { item: Item }) => (
    <TouchableOpacity 
      style={styles.productCard} 
      onPress={() => onProductPress(item)}
    >
      <Image 
        source={item.image ? { uri: item.image } : require("@/assets/images/partial-react-logo.png")} 
        style={styles.productImage} 
        contentFit="cover" 
      />
      <ThemedText style={styles.productName} numberOfLines={2}>{item.title}</ThemedText>
      <ThemedText style={styles.productPrice}>${item.price.toFixed(2)}</ThemedText>
      <View style={styles.productFooter}>
        <ThemedText style={styles.productCategory}>{item.category}</ThemedText>
        <View style={styles.viewCount}>
          <Ionicons name="eye" size={12} color="#999" />
          <ThemedText style={styles.viewCountText}>{item.views}</ThemedText>
        </View>
      </View>
      {!item.status && (
        <View style={styles.soldOverlay}>
          <ThemedText style={styles.soldText}>Sold</ThemedText>
        </View>
      )}
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.profileAvatar}
          contentFit="cover"
        />
        <TouchableOpacity>
          <Ionicons name="menu" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchItems}
            colors={["#FF5722"]}
            tintColor="#FF5722"
          />
        }
      >
        <ThemedView style={styles.homeTitle}>
          <ThemedText style={styles.titleText}>Home</ThemedText>
          {userEmail && (
            <ThemedText style={styles.welcomeText}>Welcome, {userEmail}</ThemedText>
          )}
        </ThemedView>

        {/* Featured Banner */}
        <View style={styles.bannerContainer}>
          <Image
            source={require("@/assets/images/partial-react-logo.png")}
            style={styles.bannerImage}
            contentFit="cover"
          />
          <View style={styles.bannerOverlay}>
            <ThemedText style={styles.bannerTitle}>Campus Marketplace</ThemedText>
            <ThemedText style={styles.bannerSubtitle}>Find great deals from students</ThemedText>
            <View style={styles.bannerButtons}>
              <TouchableOpacity style={styles.shopButton} onPress={fetchItems}>
                <ThemedText style={styles.shopButtonText}>Refresh Items</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exploreButton}>
                <ThemedText style={styles.exploreButtonText}>Categories</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Latest Items Section */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Latest Items</ThemedText>
          <Ionicons name="chevron-forward" size={24} color="#000" />
        </View>

        {loading && items.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ThemedText>Loading items...</ThemedText>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#999" />
            <ThemedText style={styles.emptyText}>No items available</ThemedText>
            <ThemedText style={styles.emptySubtext}>Check back later for new listings</ThemedText>
          </View>
        ) : (
          <FlatList
            data={items}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.productRow}
            contentContainerStyle={styles.productsGrid}
          />
        )}

        {/* Bottom Navigation Placeholder */}
        <View style={styles.bottomNavPlaceholder} />
      </ScrollView>
    </SafeAreaView>
  )
}

function ProductDetailScreen({
  product,
  onBackPress,
}: {
  product: Item
  onBackPress: () => void
}) {
  const [fontsLoaded] = useFonts({
    "Outfit-Regular": Outfit_400Regular,
    "Outfit-Medium": Outfit_500Medium,
    "Outfit-SemiBold": Outfit_600SemiBold,
    "Outfit-Bold": Outfit_700Bold,
  })

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [detailedProduct, setDetailedProduct] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const { token, userEmail } = useAuth()

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
      fetchItemDetails()
    }
  }, [fontsLoaded, product.id])

  const fetchItemDetails = async () => {
    try {
      setLoading(true)
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      console.log('Fetching item details for ID:', product.id)
      
      const response = await fetch(`${API_BASE_URL}/api/items/${product.id}`, {
        method: 'GET',
        headers: headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch item details: ${response.status}`)
      }
      
      const itemData = await response.json()
      console.log('Item details fetched:', itemData)
      setDetailedProduct(itemData)
    } catch (error) {
      console.error('Error fetching item details:', error)
      Alert.alert('Error', 'Failed to load item details. Please try again.')
      // Fallback to the basic product data if detailed fetch fails
      setDetailedProduct(product)
    } finally {
      setLoading(false)
    }
  }

  if (!fontsLoaded) {
    return null
  }

  // Use detailed product data if available, otherwise fallback to basic product data
  const displayProduct = detailedProduct || product

  // For now, we'll use a single image. You can extend this to support multiple images
  const productImages = displayProduct.image ? [{ uri: displayProduct.image }] : [require("@/assets/images/partial-react-logo.png")]

  const isOwnItem = userEmail === displayProduct.seller

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBackPress}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.detailHeaderTitle}>{displayProduct.title}</ThemedText>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchItemDetails}
            colors={["#FF5722"]}
            tintColor="#FF5722"
          />
        }
      >
        {loading && !detailedProduct ? (
          <View style={styles.loadingContainer}>
            <ThemedText>Loading item details...</ThemedText>
          </View>
        ) : (
          <>
            {/* Image Carousel */}
            <View style={styles.imageCarouselContainer}>
              <TouchableOpacity style={styles.wishlistButton}>
                <Ionicons name="heart-outline" size={24} color="#999" />
              </TouchableOpacity>
              <Image 
                source={productImages[currentImageIndex]} 
                style={styles.detailProductImage} 
                contentFit="cover" 
              />
              {productImages.length > 1 && (
                <View style={styles.imageIndicators}>
                  {productImages.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.indicator, currentImageIndex === index && styles.indicatorActive]}
                      onPress={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </View>
              )}
              {!displayProduct.status && (
                <View style={styles.soldBanner}>
                  <ThemedText style={styles.soldBannerText}>SOLD</ThemedText>
                </View>
              )}
            </View>

            {/* Product Info */}
            <View style={styles.productInfoContainer}>
              <ThemedText style={styles.productCategory}>{displayProduct.category}</ThemedText>
              <ThemedText style={styles.detailProductName}>{displayProduct.title}</ThemedText>
              <ThemedText style={styles.detailPrice}>${displayProduct.price.toFixed(2)}</ThemedText>
              
              {/* Description */}
              <View style={styles.descriptionSection}>
                <ThemedText style={styles.sectionTitle}>Description</ThemedText>
                <ThemedText style={styles.descriptionText}>{displayProduct.description}</ThemedText>
              </View>

              {/* Seller Info */}
              <View style={styles.sellerSection}>
                <ThemedText style={styles.sectionTitle}>Seller</ThemedText>
                <ThemedText style={styles.sellerText}>{displayProduct.sellerName || displayProduct.seller}</ThemedText>
                {isOwnItem && (
                  <View style={styles.ownItemBadge}>
                    <ThemedText style={styles.ownItemText}>Your Item</ThemedText>
                  </View>
                )}
              </View>

              {/* Item Details */}
              <View style={styles.detailsSection}>
                <ThemedText style={styles.sectionTitle}>Item Details</ThemedText>
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Quantity Available:</ThemedText>
                  <ThemedText style={styles.detailValue}>{displayProduct.quantity}</ThemedText>
                </View>
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Views:</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {displayProduct.views} {detailedProduct && ``}
                  </ThemedText>
                </View>
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Status:</ThemedText>
                  <ThemedText style={[styles.detailValue, displayProduct.status ? styles.availableText : styles.soldText]}>
                    {displayProduct.status ? 'Available' : 'Sold'}
                  </ThemedText>
                </View>
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Listed:</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {new Date(displayProduct.createdAt).toLocaleDateString()}
                  </ThemedText>
                </View>
              </View>

              {/* Action Buttons */}
              {!isOwnItem && (
                <TouchableOpacity 
                  style={[
                    styles.addToCartButton,
                    !displayProduct.status && styles.disabledButton
                  ]}
                  disabled={!displayProduct.status}
                >
                  <ThemedText style={styles.addToCartButtonText}>
                    {displayProduct.status ? 'Add to Cart' : 'Sold Out'}
                  </ThemedText>
                </TouchableOpacity>
              )}

              {isOwnItem && (
                <View style={styles.ownerActions}>
                  <ThemedText style={styles.ownerNote}>This is your item</ThemedText>
                  <View style={styles.ownerButtons}>
                    <TouchableOpacity style={styles.editButton}>
                      <ThemedText style={styles.editButtonText}>Edit</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton}>
                      <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={{ height: 40 }} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function App() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [currentScreen, setCurrentScreen] = useState<"home" | "detail">("home")
  const [selectedProduct, setSelectedProduct] = useState<Item | null>(null)
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, authLoading, router])

  if (authLoading || !isAuthenticated) {
    return null
  }

  const handleProductPress = async (product: Item) => {
    setSelectedProduct(product)
    setCurrentScreen("detail")
  }

  const handleBackPress = () => {
    setCurrentScreen("home")
    setSelectedProduct(null)
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {currentScreen === "home" ? (
        <HomeScreen onProductPress={handleProductPress} />
      ) : (
        <ProductDetailScreen product={selectedProduct!} onBackPress={handleBackPress} />
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  scrollView: {
    flex: 1,
  },
  homeTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  titleText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    fontFamily: "Outfit-Bold",
  },
  welcomeText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  bannerContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    height: 280,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Outfit-Bold",
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "#fff",
    fontFamily: "Outfit-Regular",
    marginBottom: 16,
  },
  bannerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  shopButton: {
    backgroundColor: "#FF5722",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  shopButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Outfit-SemiBold",
  },
  exploreButton: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Outfit-SemiBold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Outfit-SemiBold",
  },
  productsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  productRow: {
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  productCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
  },
  productImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Outfit-SemiBold",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF5722",
    fontFamily: "Outfit-SemiBold",
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCountText: {
    fontSize: 11,
    color: "#999",
    fontFamily: "Outfit-Regular",
  },
  soldOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  soldText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Outfit-SemiBold",
  },
  availableText: {
    color: '#4CAF50',
  },
  bottomNavPlaceholder: {
    height: 80,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  // Product Detail Styles
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  detailHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Outfit-SemiBold",
    flex: 1,
    textAlign: "center",
  },
  imageCarouselContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    height: 320,
    position: 'relative',
  },
  wishlistButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: "#fff",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  detailProductImage: {
    width: "100%",
    height: "100%",
  },
  imageIndicators: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  indicatorActive: {
    backgroundColor: "#fff",
  },
  soldBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  soldBannerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Outfit-Bold",
  },
  productInfoContainer: {
    paddingHorizontal: 16,
  },
  productCategory: {
    fontSize: 12,
    fontWeight: "400",
    color: "#999",
    fontFamily: "Outfit-Regular",
    marginBottom: 8,
  },
  detailProductName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    fontFamily: "Outfit-Bold",
    marginBottom: 12,
  },
  detailPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF5722",
    fontFamily: "Outfit-Bold",
    marginBottom: 20,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#666",
    fontFamily: "Outfit-Regular",
    lineHeight: 22,
  },
  sellerSection: {
    marginBottom: 20,
    position: 'relative',
  },
  sellerText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    fontFamily: "Outfit-Medium",
  },
  ownItemBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ownItemText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1976D2",
    fontFamily: "Outfit-SemiBold",
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "#666",
    fontFamily: "Outfit-Regular",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    fontFamily: "Outfit-Medium",
  },
  addToCartButton: {
    backgroundColor: "#FF5722",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: "#999",
  },
  addToCartButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Outfit-SemiBold",
  },
  ownerActions: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  ownerNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  ownerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Outfit-SemiBold",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Outfit-SemiBold",
  },
})