package com.it355.it355pz02.controller;

import com.it355.it355pz02.model.CategoryPostDTO;
import com.it355.it355pz02.model.CategoryDTO;
import com.it355.it355pz02.model.Category;
import com.it355.it355pz02.model.CategoryRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository categoryRepository;

    @Autowired
    public CategoryController(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    // GET all categories
    // Corresponding frontend: useQuery_FetchCategories
    @GetMapping
    public ResponseEntity<List<CategoryDTO>> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        List<CategoryDTO> categoryDTOs = categories.stream()
                .map(CategoryDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(categoryDTOs);
    }

    // GET category by ID
    // Corresponding frontend: useQuery_FetchCategory(id)
    @GetMapping("/{id}")
    public ResponseEntity<CategoryDTO> getCategoryById(@PathVariable Long id) {
        Optional<Category> category = categoryRepository.findById(id);
        return category.map(c -> ResponseEntity.ok(CategoryDTO.fromEntity(c)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // POST new category
    // Corresponding frontend: useQuery_AddCategory
    @PostMapping
    public ResponseEntity<CategoryDTO> createCategory(@Valid @RequestBody CategoryPostDTO categoryPostDTO) {
        // Check if a category with the same name already exists
        if (categoryRepository.findByName(categoryPostDTO.getName()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .build(); // Or return a more specific error DTO
        }

        Category category = new Category();
        category.setName(categoryPostDTO.getName());
        // Description from CategoryPostDTO is currently not used in Category model
        // If you add description to Category model, map it here.

        Category savedCategory = categoryRepository.save(category);
        return ResponseEntity.status(HttpStatus.CREATED).body(CategoryDTO.fromEntity(savedCategory));
    }

    // PUT update category
    // Corresponding frontend: useQuery_PutCategory(id)
    @PutMapping("/{id}")
    public ResponseEntity<CategoryDTO> updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryPostDTO categoryPostDTO) {
        Optional<Category> existingCategoryOptional = categoryRepository.findById(id);

        if (existingCategoryOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Category existingCategory = existingCategoryOptional.get();

        // Check if the new name conflicts with another existing category (excluding itself)
        if (categoryRepository.findByName(categoryPostDTO.getName())
                .filter(c -> !c.getId().equals(id))
                .isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        existingCategory.setName(categoryPostDTO.getName());
        // Update other fields if they are added to CategoryPostDTO and Category model

        Category updatedCategory = categoryRepository.save(existingCategory);
        return ResponseEntity.ok(CategoryDTO.fromEntity(updatedCategory));
    }

    // DELETE category
    // Corresponding frontend: useQuery_DeleteCategory(id)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        if (!categoryRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        categoryRepository.deleteById(id);
        return ResponseEntity.noContent().build(); // 204 No Content
    }
}