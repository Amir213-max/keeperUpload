import { gql } from "graphql-request";

/** Schema: Query.mainRootCategories — جذور is_main مع الفرعيات للـ Sidebar */
export const MAIN_ROOT_CATEGORIES_QUERY = gql`
  query MainRootCategories {
    mainRootCategories {
      id
      name
      slug
      order
      is_main
      show_brands_in_menu
      subCategories {
        id
        name
        slug
        order
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
      phone
      date_of_birth
      gender
      avatar
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
 * - Query.productsWithFilters via PRODUCTS_WITH_FILTERS_LISTING_QUERY (see app/lib/fetchCategoryListing.js)
 * - PRODUCTS_BY_CATEGORY_FILTERED_QUERY (Query.productsByCategory) for pagination
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
 * LEGACY — avoid for listings.
 * Schema: Query.rootCategory(id) with nested products (no limit on nested products — can overload API).
 * Prefer: Query.productsWithFilters (PRODUCTS_WITH_FILTERS_LISTING_QUERY) or Query.productsByCategory.
 * Kept only for backward compatibility; no remaining in-app imports after category listing refactor.
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
 * Schema: Query.productsByCategory + Query.rootCategory
 * Root-level limit/offset (unlike nested rootCategory.products).
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
    brand_category_covers {
      id
      cover
      cover_url
      brand {
        id
        name
      }
      category {
        id
        name
      }
    }
  }
}
`;

/** Schema: Query.productsWithFilters only (no rootCategory metadata). */
export const PRODUCTS_WITH_FILTERS_QUERY = gql`
  query ProductsWithFilters($limit: Int, $offset: Int, $filters: ProductFiltersInput) {
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

/** Schema: Query.productsWithFilters + Query.rootCategory */
export const PRODUCTS_WITH_FILTERS_LISTING_QUERY = gql`
  query ProductsWithFiltersListing($categoryId: ID!, $filters: ProductFiltersInput, $limit: Int, $offset: Int) {
    productsWithFilters(filters: $filters, limit: $limit, offset: $offset) {
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
        slug
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
      brand_category_covers {
        id
        cover
        cover_url
        brand {
          id
          name
        }
        category {
          id
          name
        }
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
 * To fetch products, use Query.productsWithFilters (see PRODUCTS_WITH_FILTERS_LISTING_QUERY + fetchCategoryListing).
 */
export const GET_CATEGORIES_ONLY_QUERY = gql`
query GetCategoriesOnly {
  rootCategories {
    id
    name
    slug
    image
    subCategories {
      id
      name
      slug
    }
    brand_category_covers {
      id
      cover
      cover_url
      brand {
        id
        name
      }
      category {
        id
        name
      }
    }
  }
}
`;

/** publicSettings for navbar logo (group `logo`) + offers banner; client via /api/graphql */
export const PUBLIC_SETTINGS_NAV_QUERY = gql`
  query PublicSettingsNav {
    publicSettings {
      key
      value
      group
      url
      image
      multiple_images
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
 * - Query.productsWithFilters for product listings
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
      size
      variant_sku
      stock {
        qty
        minQty
        maxQty
        isInStock
      }
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
          isInStock
        }
        id
        name
        price
        size
        variant_sku
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
      variant_id
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





/**
 * Homepage `brand_category_products`: newest products via Query.productsAdvanced.
 * Backend sort field names are not in this repo — if this errors, try sort_by "updated_at" or "id".
 * Fallback idea: Query.productsWithFilters + client sort by created_at + slice(0, 15).
 */
export const HOME_BRAND_CATEGORY_PRODUCTS_QUERY = gql`
  query HomeBrandCategoryProducts(
    $filters: ProductFiltersInput!
    $page: Int
    $per_page: Int!
    $sort_by: String
    $sort_order: String
  ) {
    productsAdvanced(
      filters: $filters
      page: $page
      per_page: $per_page
      sort_by: $sort_by
      sort_order: $sort_order
    ) {
      data {
        id
        name
        sku
        images
        created_at
        updated_at
        price_range_from
        price_range_exact_amount
        list_price_amount
        brand_name
        brand {
          name
        }
        productBadges {
          label
          color
        }
      }
    }
  }
`;

/**
 * Homepage `brand_category_products`: products by category_id + brand_id via Query.productsWithFilters.
 * Fetch a window (e.g. 80), sort by created_at desc on the client, then slice(0, 15).
 */
export const HOME_BRAND_CATEGORY_WITH_FILTERS_QUERY = gql`
  query HomeBrandCategoryWithFilters(
    $filters: ProductFiltersInput
    $limit: Int!
    $offset: Int
  ) {
    productsWithFilters(filters: $filters, limit: $limit, offset: $offset) {
      id
      name
      sku
      images
      created_at
      updated_at
      price_range_from
      price_range_exact_amount
      list_price_amount
      brand_name
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
      brand_id
      root_category_id
      
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
    selected_products {
      id
      name
      sku
      images
      price_range_from
      price_range_exact_amount
      list_price_amount
      brand_name
      productBadges {
        label
        color
      }
    }
  }
}


`;




/** Schema: Query.activeCountries */
export const ACTIVE_COUNTRIES_QUERY = gql`
  query ActiveCountries {
    activeCountries {
      id
      name
      code
      normal_shipping_cost
      fast_shipping_cost
      is_active
    }
  }
`;

/** Schema: Query.calculateShipping */
export const CALCULATE_SHIPPING_QUERY = gql`
  query CalculateShipping($country_id: ID!) {
    calculateShipping(country_id: $country_id) {
      country {
        id
        name
        code
      }
      normal_shipping {
        cost
      }
      fast_shipping {
        cost
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
      is_main
      show_brands_in_menu
      parent {
        id
        name
        order
        is_main
      }
      subCategories {
        id
        name
        slug
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
      author_name
      date
    }
  }
`;

export const GET_BLOG_BY_ID = gql`
  query GetBlog($id: ID!) {
    blog(id: $id) {
      id
      image
      title
      description
      author_name
      date
    }
  }
`;
