import { gql } from "graphql-request";

// ✅ جلب كل الـ Main Root Categories (العناوين الرئيسية + الفرعية)
export const MAIN_ROOT_CATEGORIES_QUERY = gql`
  query MainRootCategories {
    mainRootCategories {
      id
      name
      slug
      subCategories {
        id
        name
        slug
      }
    }
  }
`;
export const GET_WISHLIST_ITEMS = gql`
query GetWishlistItems($wishlistId: ID!) {
  wishlist(id: $wishlistId) {
    id
    name
    items {
      id
      product {
        id
        name
        sku
        images
        list_price_amount
        list_price_currency
        price_range_exact_amount
        brand {
          name
        }
        rootCategories {
          id
          name
        }
      }
    }
  }
}

`;


export const GET_ME = gql`
  query Me {
   
      me {
        id
        name
        email
    }
  }
`;

export const GET_PROFILE = gql`
  query GetProfile($token: String!) {
    profile(token: $token) {
      id
      name
      email
      orders {
        id
      }
      created_at
      updated_at
    }
  }
`;

/**
 * ⚠️ DEPRECATED: This query fetches products without categoryId, causing 503 errors.
 * 
 * DO NOT USE: Fetching all products without categoryId causes server overload.
 * 
 * Use instead:
 * - PRODUCTS_BY_CATEGORY_QUERY with a specific categoryId
 * - PRODUCTS_BY_CATEGORY_FILTERED_QUERY for pagination with categoryId
 */
export const PRODUCTS_QUERY = gql`
  query Products($limit: Int, $offset: Int) {
    products(limit: $limit, offset: $offset) {
      id
      name
      sku
      description
      list_price_amount
      images
      rootCategories {
        id
        name
        slug
        parent {
          id
          name
          slug
        }
      }
    }
  }
`;

/**
 * ✅ جلب المنتجات حسب الكاتيجوري
 * 
 * IMPORTANT: 
 * - The GraphQL schema does NOT support `limit` on `rootCategory.products`
 * - Must use `productsByCategory(categoryId: $categoryId)` at root level
 * - Client-side slicing (12-24 items) should be applied after fetching
 * - Fetching products without categoryId causes 503 errors
 * 
 * This query fetches ONLY essential fields for product listing pages.
 * Heavy fields (descriptions, full attributes) should be fetched on product detail pages only.
 */
export const PRODUCTS_BY_CATEGORY_QUERY = gql`
query ProductsByCategory($categoryId: ID!) {
  # Get category info
  rootCategory(id: $categoryId) {
    id
    name
    slug
    image
    # ⚠️ rootCategory.products does NOT support limit argument
    # Fetch products using productsByCategory at root level instead
    products {
      id
      name
      sku
      images
      list_price_amount
      list_price_currency
      price_range_exact_amount
    created_at
      updated_at
      productBadges {
        label
        color
      }
      brand_name
      brand_logo_url
      rootCategories {
        id
        name
      }
      # Essential attributes only (for filtering)
      productAttributeValues {
        id
        key
        attribute {
          id
          label
          key
        }
      }
    }
    subCategories {
      id
      name
      slug
      # ⚠️ subCategories.products does NOT support limit argument
      products {
        id
        name
        sku
        images
        list_price_amount
        list_price_currency
        price_range_exact_amount
        created_at
        updated_at
        productBadges {
          label
          color
        }
        brand_name
        brand_logo_url
        rootCategories {
          id
          name
        }
        # Essential attributes only (for filtering)
        productAttributeValues {
          id
          key
          attribute {
            id
            label
            key
          }
        }
      }
    }
  }
}
`;

/**
 * ✅ جلب المنتجات حسب الكاتيجوري باستخدام productsByCategory (root level)
 * 
 * This is the preferred method as it supports limit/offset at the root level.
 * Use this for pagination and limiting results.
 */
export const PRODUCTS_BY_CATEGORY_FILTERED_QUERY = gql`
query ProductsByCategoryFiltered($categoryId: ID!, $limit: Int, $offset: Int) {
  # Use productsByCategory at root level (supports limit/offset)
  productsByCategory(category_id: $categoryId, limit: $limit, offset: $offset) {
    id
    name
    sku
    images
    list_price_amount
    list_price_currency
    price_range_exact_amount
    created_at
    updated_at
    productBadges {
      label
      color
    }
    brand {
      id
      name
    }
    rootCategories {
      id
      name
      slug
    }
    # Essential attributes only (for filtering)
    productAttributeValues {
      id
      key
      attribute {
        id
        label
        key
      }
    }
  }
  
  # Also get category info
  rootCategory(id: $categoryId) {
    id
    name
    slug
    image
    subCategories {
      id
      name
      slug
    }
  }
}
`;

export const PRODUCTS_WITH_FILTERS_QUERY = gql`
  query ProductsWithFilters($limit: Int!, $offset: Int!, $filters: ProductFilterInput) {
    productsWithFilters(
      filters: $filters
      limit: $limit
      offset: $offset
    ) {
      id
      sku
      name
      images
      created_at
      updated_at
      productBadges {
        label
        color
      }
      list_price_amount
      price_range_exact_amount
      description
      productAttributeValues {
        id
        key
        attribute {
          key
          id
          label
        }
      }
      brand {
        id
        name
      }
    }
  }
`;

/**
 * ✅ جلب التصنيفات فقط (بدون منتجات)
 * 
 * IMPORTANT: This query fetches ONLY categories, not products.
 * Fetching all products without categoryId and limit causes 503 errors.
 * 
 * To fetch products, use PRODUCTS_BY_CATEGORY_QUERY with a specific categoryId and limit.
 */
export const GET_CATEGORIES_ONLY_QUERY = gql`
query GetCategoriesOnly {
  rootCategories {
    id
    name
    slug
    image
  }
}
`;

/**
 * ⚠️ DEPRECATED: This query fetches products without limits, causing 503 errors.
 * 
 * DO NOT USE: This query will cause GraphQL 503 errors due to fetching all products.
 * 
 * Use instead:
 * - GET_CATEGORIES_ONLY_QUERY for categories only
 * - PRODUCTS_BY_CATEGORY_QUERY with categoryId and limit for products
 * 
 * This query is kept for backward compatibility but should be removed.
 */
export const GET_CATEGORIES_QUERY = gql`
query GetCategories {
  rootCategories {
    id
    name
    slug
    image
  }
  products {
  created_at
      updated_at
 
    list_price_amount
    list_price_currency
    relative_list_price_difference
    price_range_from
    price_range_to
    price_range_currency
    price_range_exact_amount
    price_range_maximum_amount
    price_range_minimum_amount
    id
    name
    sku
    description
    are_shoes
 
    images
    brand {
      id
      name
    }
    productAttributeValues {
      id
      key
      attribute {
        id
        label
        key
      }
    }
  }
}
`;

/**
 * ⚠️ DEPRECATED: This query fetches all products without limits, causing 503 errors.
 * 
 * DO NOT USE: Fetching all products without categoryId and limit causes server overload.
 * 
 * Use instead: PRODUCTS_BY_CATEGORY_QUERY with a specific categoryId and limit.
 */
export const PRODUCTS_SHOES_QUERY = gql` 


query PRODUCTS_SHOES_QUERY {
  products {
  created_at
      updated_at
    list_price_amount
    list_price_currency
    relative_list_price_difference
    price_range_from
    price_range_to
    price_range_currency
    price_range_exact_amount
    price_range_maximum_amount
    price_range_minimum_amount
    id
    description
    sku
    name

          productBadges{
        label
        color
      }

    are_shoes
    list_price_amount
    brand {
      id
      name
    }
    productAttributeValues {
      id
      key
      attribute {
        id
        label
      }
    }
    images
    rootCategories {
      id
      name
    }
  }
}

`;


export const GET_PAGE_BY_SLUG = gql`
  query getPageBySlug($slug: String!) {
    pageBySlug(slug: $slug) {
      id
      name
      slug
    }
  }
`;

/**
 * ⚠️ DEPRECATED: This query fetches all products without limits, causing 503 errors.
 * 
 * DO NOT USE: Fetching all products without categoryId and limit causes server overload.
 * 
 * Use instead: PRODUCTS_BY_CATEGORY_QUERY with a specific categoryId and limit.
 * Filter products with badges on the client side after fetching.
 */
export const PRODUCTS_SALES_QUERY = gql` 


query PRODUCTS_SALES_QUERY {
  products {
    productBadges{
      label
      color
    }
      created_at
      updated_at
    list_price_amount
    list_price_currency
    relative_list_price_difference
    price_range_from
    price_range_to
    price_range_currency
    price_range_exact_amount
    price_range_maximum_amount
    price_range_minimum_amount
    id
    description
    sku
    name
    are_shoes
    list_price_amount
    brand {
      id
      name
    }
    productAttributeValues {
      id
      key
      attribute {
        id
        label
      }
    }
    images
    rootCategories {
      id
      name
    }
  }
}




`;


// ✅ جلب تفاصيل منتج واحد بالـ ID
export const PRODUCT_QUERY = gql`
  query Product($id: ID!) {
    product(id: $id) {
      id
      name
      sku
      description
      list_price_amount
      images
      variants {
        id
        name
        price
      }
      brand {
        id
        name
      }
      rootCategories {
        id
        name
        slug
      }


      
    }
  }
`;
export const PRODUCTS_BY_IDS_QUERY = gql`
query getproduct ($id: String!) {
  product(id: $id) {
    id
    name
    sku
    productBadges{
      label
      color
    }
    description_ar
    description_en
    created_at
    updated_at
    images
    variants {
      id
      name
      price
    }
    productAttributeValues {
      id
      key
      attribute {
        id
        label
      }
    }
    brand {
      id
      name
    }


    list_price_amount
    list_price_currency
    relative_list_price_difference
    price_range_from
    price_range_to
    price_range_currency
    price_range_exact_amount
    price_range_maximum_amount
    price_range_minimum_amount
  }
}
`;

export const GET_PRODUCT_BY_SKU = gql`
  query GetProductBySku($sku: String!) {
    productBySku(sku: $sku) {
      id
      name
      sku
      description_ar
      description_en
      
      images
      variants {
      stock{
          qty
          maxQty
          minQty
          
        }
        id
        name
        price
        size
      }
      productAttributeValues {
        id
        key
        attribute {
          id
          label
        }
      }
      brand {
        id
        name
        logo
      }

productBadges{
label
color
}


      list_price_amount
      list_price_currency
      relative_list_price_difference
      price_range_from
      price_range_to
      price_range_currency
      price_range_exact_amount
      price_range_maximum_amount
      price_range_minimum_amount
    }
  }
`;



export const GET_DEFAULT_WISHLIST = gql`
  query {
    wishlists(is_default: true) {
      id
      name
    }
  }
`;

export const RECOMMENDED_PRODUCTS_QUERY =gql `
  query GetRecommendedProducts($productId: ID!) {
    productsWithCategoryRecommendations(product_id: $productId) {
      recommended_products {
        id
        name
        sku
        images
        productBadges{
        color
label
}
  productAttributeValues {
        id
        key
        attribute {
          id
          label
        }
      }
relative_list_price_difference
price_range_exact_amount
      list_price_amount
        brand {
          id
          name
        }
      }
    }
  }
`;
export const GET_ORDERS = gql`
query GetOrders {
  orders {
    id
    number
    reference_id
    payment_status
    # FIX: Removed tags field as it can be null and causes GraphQL error "Cannot return null for non-nullable field Order.tags"
    # tags
    # FIX: Removed tracking_urls field as it can be null and causes GraphQL error "Cannot return null for non-nullable field Order.tracking_urls"
    # tracking_urls
    published
    created_at
    updated_at
    subtotal
    vat_amount
    shipping_cost
    shipping_type
    total_amount
    cart_id
    user {
      id
      name
      email
    }
    items {
      id
      order_id
      product_id
      product_name
      product_sku
      quantity
      unit_price
      total_price
      product_data
      
      
      product {
       id
    sku
    sort_order
    is_online
    printable
    are_shoes
    can_be_pre_ordered
    published
    list_price_amount
    list_price_currency
    relative_list_price_difference
    price_range_from
    price_range_to
    price_range_currency
    price_range_exact_amount
    price_range_maximum_amount
    price_range_minimum_amount
    offer_code
    offer_color_css
    offer_countdown_to
    offer_discount_percentage
    offer_is_list_price_based
    offer_price_amount
    offer_price_currency
    display_prices
    release_date
    created_at
    updated_at
    shoe_size_region
    number_of_images
    video
    video_url
    video_thumbnail
    video_thumbnail_url
    categories
    tier_prices
    
    name
    name_without_brand
    url
    brand_name
    brand_logo_url
    description
    name_en
    name_ar
    name_without_brand_en
    name_without_brand_ar
    url_en
    url_ar
    brand_name_en
    brand_name_ar
    brand_logo_url_en
    brand_logo_url_ar
    description_en
    description_ar
    brand {
      id
      name
    
    }
    variants {
      id
     
    }
    rootCategories {
      id
      name
      slug
    }
    productBadges {
      id
     label
      color
    }
    productAttributeValues {
      id
      attribute{
        label
      }
    }
    images
      }
      quantity
    
    }

   
  }
}

`;





export const GET_ACTIVE_HOME_PAGE_BLOCKS = gql`
query {
  activeHomepageBlocks {
    id
    type
    sort_order
    button_style
    button_text
    button_url
    button_location
    title
    is_active
    sort_order
    section
    display_limit
    background_color
    text_color
    css_class
    created_at
    updated_at
    display_name
    css_classes
    inline_styles
    content {
      slides {
        image
        title
        description
        button_text
        button_link
      }
      autoplay
      show_dots
      show_arrows
      interval
      product_ids{
       product_id
        
      }
    
      
      per_row
      show_price
      show_add_to_cart
      banners {
        image
        mobile_image
        title
        link
        description
      }
      height
      images {
        image
        title
        description
        link
      }
      show_titles
      show_descriptions
    
      show_names
      content
      alignment
      font_size
      max_width
    }
    settings {
      custom_settings
    }
    typed_content {
      data
    }
  }
}


`;


export const UNREAD_NOTIFICATIONS_QUERY = gql`
  query UnreadNotifications($user_id: ID!) {
    unreadNotifications(user_id: $user_id) {
      id
      type
      notifiable_type
      notifiable_id
      read_at
      created_at
      updated_at
      notifiable {
        id
        name
        email
      }
    }
  }
`;










export const Root_CATEGORIES = gql`
  query {
    rootCategories {
      id
      name
      slug
      image
      order
      parent {
        id
        name
        order
      }
      subCategories {
        id
        name
        order
      }
    }
  }
`;



/**
 * ⚠️ DEPRECATED: This query fetches products without categoryId and limit.
 * 
 * DO NOT USE: Fetching products without categoryId and limit causes 503 errors.
 * 
 * Use instead: PRODUCTS_BY_CATEGORY_QUERY with categoryId and limit,
 * then filter by brand on the client side.
 */
export const FILTER_PRODUCTS_BY_BRAND = gql`
  query filterProductsByBrand($filters: ProductFiltersInput) {
    products(filters: $filters) {
      id
      name
      sku
      brand {
        id
        name
      }
      images
      price_range_exact_amount
      list_price_amount
      productAttributeValues {
        key
        attribute {
          label
        }
      }
    }
  }
`;

// ✅ Query جديد لجلب المنتجات بالبراند
export const PRODUCTS_BY_BRAND_QUERY = gql`
  query productsByBrand($brand_id: ID!) {
    productsByBrand(brand_id: $brand_id) {
      id
      name
      sku
      url
      images
      number_of_images
      price_range_exact_amount
      price_range_from
      price_range_to
      price_range_currency
      list_price_amount
      offer_price_amount
      offer_discount_percentage
      brand_name
      brand_logo_url
      is_online
      published
      created_at
      updated_at
      productBadges {
        label
        color
      }
      productAttributeValues {
        id
        key
        attribute {
          id
          label
          key
        }
      }
      variants {
        id
        name
        price
        size
      }
      rootCategories {
        id
        name
      }
    }
  }
`;

export const SEARCH_PRODUCTS_QUERY = gql`
  query SearchProducts($query: String!, $limit: Int, $offset: Int) {
    productsSearch(query: $query, limit: $limit, offset: $offset) {
      id
      name
      sku
      images
      list_price_amount
      price_range_exact_amount
      brand {
        id
        name
      }
      productBadges {
        label
        color
      }
    }
  }
`;

export const GET_BLOGS_QUERY = gql`
  query GetBlogs {
    blogs {
      id
      image
      title
      description
     
    }
  }
`;
