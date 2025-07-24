package com.it355.app.controller;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.it355.app.model.*;

@Controller
@RequestMapping("/categories")
public class CategoryController {
    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @GetMapping("/")
    public String listCategories(Model model) {
        model.addAttribute("categories", categoryRepository.findAll());
        return "category_list";
    }

    @GetMapping("/new")
    public String newCategoryForm(Model model) {
        model.addAttribute("category", new Category());
        return "category_form";
    }

    @PostMapping("/save")
    public String saveCategory(@ModelAttribute Category category) {
        categoryRepository.save(category);
        return "redirect:/categories/";
    }

    @GetMapping("/edit/{id}")
    public String editCategoryForm(@PathVariable Integer id, Model model) {
        model.addAttribute("category", categoryRepository.findById(id).orElse(null));
        return "category_form";
    }

    @GetMapping("/delete/{id}")
    public String deleteCategory(@PathVariable Integer id) {
        Optional<Category> categoryOptional = categoryRepository.findById(id);
        if (categoryOptional.isPresent()) {
            Category categoryToDelete = categoryOptional.get();

            // Hibernate's only ON DELETE SET NULL logic is not working, so implemented cascading manually.
            List<Product> productsToClear = productRepository.findByCategoryId(categoryToDelete.getId());
            for (Product product : productsToClear) {
                product.setCategory(null);
                productRepository.save(product);
            }

            categoryRepository.deleteById(id);
        }
        return "redirect:/categories/";
    }
}
