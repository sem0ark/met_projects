package com.it355.it355pz02;

import com.it355.it355pz02.controller.CategoryController;
import com.it355.it355pz02.controller.dto.CategoryDTO;
import com.it355.it355pz02.controller.dto.CategoryPostDTO;
import com.it355.it355pz02.model.Category;
import com.it355.it355pz02.model.CategoryRepository;
import com.it355.it355pz02.utils.APIException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class) // Enables Mockito annotations with JUnit 5.
public class CategoryControllerUnitTest {

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryController categoryController;

    private Category category1;
    private Category category2;
    private CategoryDTO categoryDTO1;
    private CategoryDTO categoryDTO2;

    @BeforeEach
    void setUp() {
        category1 = new Category(1L, "Electronics");
        category2 = new Category(2L, "Clothes");
        categoryDTO1 = CategoryDTO.fromEntity(category1);
        categoryDTO2 = CategoryDTO.fromEntity(category2);
    }

    @Test
    void testGetAllCategories_Success() {
        when(categoryRepository.findAll()).thenReturn(Arrays.asList(category1, category2));

        ResponseEntity<List<CategoryDTO>> response = categoryController.getAllCategories();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());
        assertEquals(categoryDTO1.getName(), response.getBody().get(0).getName());
        assertEquals(categoryDTO2.getName(), response.getBody().get(1).getName());
        verify(categoryRepository, times(1)).findAll();
    }

    @Test
    void testGetCategoryById_Found() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category1));

        ResponseEntity<CategoryDTO> response = categoryController.getCategoryById(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(categoryDTO1.getName(), response.getBody().getName());
        verify(categoryRepository, times(1)).findById(1L);
    }

    @Test
    void testGetCategoryById_NotFound() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        APIException exception = assertThrows(APIException.class, () -> {
            categoryController.getCategoryById(99L);
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
        verify(categoryRepository, times(1)).findById(99L);
    }

    @Test
    void testCreateCategory_Success() {
        CategoryPostDTO newCategoryPostDTO = new CategoryPostDTO("Books");
        Category savedCategory = new Category(3L, "Books");

        when(categoryRepository.findByName(newCategoryPostDTO.getName())).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenReturn(savedCategory);

        ResponseEntity<CategoryDTO> response = categoryController.createCategory(newCategoryPostDTO);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(savedCategory.getName(), response.getBody().getName());
        assertEquals(savedCategory.getId(), response.getBody().getId());
        verify(categoryRepository, times(1)).findByName("Books");
        verify(categoryRepository, times(1)).save(any(Category.class));
    }

    @Test
    void testCreateCategory_Conflict() {
        CategoryPostDTO existingCategoryPostDTO = new CategoryPostDTO("Electronics");
        when(categoryRepository.findByName("Electronics")).thenReturn(Optional.of(category1));

        APIException exception = assertThrows(APIException.class, () -> {
            categoryController.createCategory(existingCategoryPostDTO);
        });

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        verify(categoryRepository, times(1)).findByName("Electronics");
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    void testUpdateCategory_Success() {
        CategoryPostDTO updateDTO = new CategoryPostDTO("Updated Electronics");
        Category updatedCategory = new Category(1L, "Updated Electronics");

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category1));
        when(categoryRepository.findByName("Updated Electronics")).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenReturn(updatedCategory);

        ResponseEntity<CategoryDTO> response = categoryController.updateCategory(1L, updateDTO);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(updatedCategory.getName(), response.getBody().getName());
        assertEquals(updatedCategory.getId(), response.getBody().getId());
        verify(categoryRepository, times(1)).findById(1L);
        verify(categoryRepository, times(1)).findByName("Updated Electronics");
        verify(categoryRepository, times(1)).save(any(Category.class));
    }

    @Test
    void testUpdateCategory_NotFound() {
        CategoryPostDTO updateDTO = new CategoryPostDTO("NonExistent");
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        APIException exception = assertThrows(APIException.class, () -> {
            categoryController.updateCategory(99L, updateDTO);
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
        verify(categoryRepository, times(1)).findById(99L);
        verify(categoryRepository, never()).findByName(anyString());
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    void testUpdateCategory_Conflict() {
        CategoryPostDTO updateDTO = new CategoryPostDTO("Clothes");
        Category categoryWithConflictingName = new Category(2L, "Clothes");

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category1));
        when(categoryRepository.findByName("Clothes")).thenReturn(Optional.of(categoryWithConflictingName));

        APIException exception = assertThrows(APIException.class, () -> categoryController.updateCategory(1L, updateDTO));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        verify(categoryRepository, times(1)).findById(1L);
        verify(categoryRepository, times(1)).findByName("Clothes");
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    void testDeleteCategory_Success() {
        when(categoryRepository.existsById(1L)).thenReturn(true);

        doNothing().when(categoryRepository).deleteById(1L);
        ResponseEntity<Void> response = categoryController.deleteCategory(1L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(categoryRepository, times(1)).existsById(1L);
        verify(categoryRepository, times(1)).deleteById(1L);
    }

    @Test
    void testDeleteCategory_NotFound() {
        when(categoryRepository.existsById(99L)).thenReturn(false);

        APIException exception = assertThrows(APIException.class, () -> {
            categoryController.deleteCategory(99L);
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
        verify(categoryRepository, times(1)).existsById(99L);
        verify(categoryRepository, never()).deleteById(anyLong());
    }
}
