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

// ✅ جلب المنتجات (مع إمكانية تحديد limit/offset)
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

// ✅ جلب المنتجات حسب الكاتيجوري (رئيسي أو فرعي)
export const PRODUCTS_BY_CATEGORY_QUERY = gql`
query ProductsByCategory($categoryId: ID!) {
  rootCategory(id: $categoryId) {
    id
    name
   
    slug
    products {
    created_at
      updated_at
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
      id
      name
      sku
      description
      rootCategories {
        id
        name
      }
      images
      brand{
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
    subCategories {
      id
      name
      slug
      products {
        id
        name
        sku
      
        
        images
        productAttributeValues {
          id
          
          attribute {
            id
            label
          }
        }
      }
    }
  }
}

`;


export const GET_CATEGORIES_QUERY = gql`
query GetCategories {
  rootCategories {
    id
    name
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
   
  }
  }
`;

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
    tags
    
    tracking_urls
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
      parent {
        id
        name
      }
      subCategories {
        id
        name
      }
    }
  }
`;



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
