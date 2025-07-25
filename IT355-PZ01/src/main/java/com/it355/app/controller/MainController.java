package com.it355.app.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

// Add a redirect to products from the root
@Controller
@RequestMapping("/")
public class MainController {
    @GetMapping("/")
    public String goToProducts(Model model) {
        return "redirect:/products/";
    }
}
