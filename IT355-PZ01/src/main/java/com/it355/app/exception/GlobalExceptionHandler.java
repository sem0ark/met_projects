package com.it355.app.exception;

import org.springframework.http.HttpStatus;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.servlet.ModelAndView;

@ControllerAdvice // This annotation makes this class a global exception handler
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR) // HTTP 500 Response
    public ModelAndView handleIllegalArgumentException(IllegalArgumentException ex, Model model) {
        System.err.println("IllegalArgumentException caught: " + ex.getMessage());

        model.addAttribute("errorMessage", "An internal server error occurred: " + ex.getMessage());
        model.addAttribute("errorStatus", HttpStatus.INTERNAL_SERVER_ERROR.value());
        return new ModelAndView("error");
    }

    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR) // HTTP 500 Response
    public ModelAndView handleAllRuntimeExceptions(RuntimeException ex, Model model) {
        System.err.println("RuntimeException caught: " + ex.getMessage());
        ex.printStackTrace();

        model.addAttribute("errorMessage", "An unexpected error occurred: " + ex.getMessage());
        model.addAttribute("errorStatus", HttpStatus.INTERNAL_SERVER_ERROR.value());
        return new ModelAndView("error");
    }
}