package com.it355.it355pz02.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductPostDTO {
    @NotBlank(message = "Product name is required")
    private String name;

    @NotBlank(message = "Product description is required")
    private String description;

    private String descriptionLong;

    @NotNull(message = "Product price is required")
    @Positive(message = "Product price must be positive")
    private BigDecimal price;

    @NotNull(message = "Product quantity is required")
    @Positive(message = "Product quantity must be positive")
    private Integer quantity; // Assuming quantity is part of creation/update

    private List<Long> categoryIds;

    @NotBlank(message = "Product primary image URL is required")
    private String imageUrl; // This will be the first image in imageUrls

    private List<String> imageUrls; // All image URLs, including the primary
}
