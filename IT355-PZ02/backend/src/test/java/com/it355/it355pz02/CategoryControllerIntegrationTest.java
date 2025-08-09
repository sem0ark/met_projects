package com.it355.it355pz02;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.it355.it355pz02.model.Category;
import com.it355.it355pz02.model.CategoryRepository;
import com.it355.it355pz02.model.CategoryPostDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// https://stackoverflow.com/questions/31169720/disable-security-for-unit-tests-with-spring-boot
// Disable Security Configuration/Filters for this integration test
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(locations="classpath:application-test.properties")
@Transactional
@ActiveProfiles("test") // Use H2 DB and other configuration for integration tests in application-test.properties.
public class CategoryControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CategoryRepository categoryRepository;

    private Category category1;
    private Category category2;

    @BeforeEach
    void setUp() {
        categoryRepository.deleteAll();

        category1 = categoryRepository.save(new Category(null, "Electronics"));
        category2 = categoryRepository.save(new Category(null, "Clothes"));
    }

    @Test
    void shouldGetAllCategories() throws Exception {
        mockMvc.perform(get("/api/categories")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name").value(category1.getName()))
                .andExpect(jsonPath("$[1].name").value(category2.getName()));
    }

    @Test
    void shouldGetCategoryById() throws Exception {
        mockMvc.perform(get("/api/categories/{id}", category1.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(category1.getId()))
                .andExpect(jsonPath("$.name").value(category1.getName()));
    }

    @Test
    void shouldReturnNotFoundForNonExistentCategory() throws Exception {
        mockMvc.perform(get("/api/categories/{id}", 999L)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldCreateNewCategory() throws Exception {
        CategoryPostDTO newCategoryDTO = new CategoryPostDTO("Books");

        mockMvc.perform(post("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newCategoryDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("Books"));

        Optional<Category> savedCategory = categoryRepository.findByName("Books");
        assertTrue(savedCategory.isPresent());
        assertEquals("Books", savedCategory.get().getName());
    }

    @Test
    void shouldReturnConflictOnDuplicateCategoryName() throws Exception {
        CategoryPostDTO duplicateCategoryDTO = new CategoryPostDTO("Electronics");

        mockMvc.perform(post("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(duplicateCategoryDTO)))
                .andExpect(status().isConflict());
    }

    @Test
    void shouldReturnBadRequestForInvalidCreateInput() throws Exception {
        CategoryPostDTO invalidCategoryDTO = new CategoryPostDTO("");

        mockMvc.perform(post("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidCategoryDTO)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldUpdateExistingCategory() throws Exception {
        CategoryPostDTO updateDTO = new CategoryPostDTO("Updated Electronics");

        mockMvc.perform(put("/api/categories/{id}", category1.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(category1.getId()))
                .andExpect(jsonPath("$.name").value("Updated Electronics"));

        Optional<Category> updatedCategory = categoryRepository.findById(category1.getId());
        assertTrue(updatedCategory.isPresent());
        assertEquals("Updated Electronics", updatedCategory.get().getName());
    }

    @Test
    void shouldReturnNotFoundOnUpdateNonExistentCategory() throws Exception {
        CategoryPostDTO updateDTO = new CategoryPostDTO("Some Name");

        mockMvc.perform(put("/api/categories/{id}", 999L)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDTO)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnConflictOnUpdateWithConflictingName() throws Exception {
        CategoryPostDTO updateDTO = new CategoryPostDTO(category2.getName());

        mockMvc.perform(put("/api/categories/{id}", category1.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDTO)))
                .andExpect(status().isConflict());
    }

    @Test
    void shouldReturnBadRequestForInvalidUpdateInput() throws Exception {
        CategoryPostDTO invalidUpdateDTO = new CategoryPostDTO("");

        mockMvc.perform(put("/api/categories/{id}", category1.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidUpdateDTO)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldDeleteCategory() throws Exception {
        mockMvc.perform(delete("/api/categories/{id}", category1.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        Optional<Category> deletedCategory = categoryRepository.findById(category1.getId());
        assertFalse(deletedCategory.isPresent());
    }

    @Test
    void shouldReturnNotFoundOnDeleteNonExistentCategory() throws Exception {
        mockMvc.perform(delete("/api/categories/{id}", 999L)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}
