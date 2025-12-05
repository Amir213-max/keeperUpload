"use client";
import { createContext, useContext, useState } from "react";

const CategoryContext = createContext();

export function CategoryProvider({ children }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  return (
    <CategoryContext.Provider value={{ selectedCategoryId, setSelectedCategoryId }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() {
  return useContext(CategoryContext);
}
