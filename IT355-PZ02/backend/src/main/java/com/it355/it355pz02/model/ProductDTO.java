package com.it355.it355pz02.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

import org.hibernate.Hibernate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO {
    private Long id;
    private String name;
    private String description;
    private String descriptionLong;
    private BigDecimal price;
    private List<Long> categoryIds; // List of category IDs
    private String imageUrl; // Primary image URL
    private List<String> imageUrls; // List of additional image URLs

    public static ProductDTO fromEntity(Product product) {
        if (product == null) {
            return null;
        }


        if (product.getCategories() != null && !product.getCategories().isEmpty()) {
            Hibernate.initialize(product.getCategories());
        }
        List<Long> categoryIds = product.getCategories().stream()
                                    .map(category -> category.getId())
                                    .collect(Collectors.toList());

        if (product.getImages() != null && !product.getImages().isEmpty()) {
            Hibernate.initialize(product.getImages());
        }
        List<String> imageUrls = product.getImages().stream()
                                    .map(image -> image.getImageUrl())
                                    .collect(Collectors.toList());

        String primaryImageUrl = imageUrls.isEmpty() ? null : imageUrls.get(0);


        return new ProductDTO(
            product.getId(),
            product.getName(),
            product.getDescription(),
            product.getDescriptionLong(),
            product.getPrice(),
            categoryIds,
            primaryImageUrl, // Use the first image as primary, or null
            imageUrls // All image URLs
        );
    }
}
