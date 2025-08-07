package com.it355.it355pz02.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import com.it355.it355pz02.utils.APIException;

@RestControllerAdvice
public class ExceptionController {

    @ExceptionHandler(APIException.class)
    public ResponseEntity<ErrorDetails> handleAPIException(APIException exception, WebRequest webRequest) {
        ErrorDetails errorDetails = new ErrorDetails(exception.getMessage());

        return new ResponseEntity<>(errorDetails, exception.getStatus());
    }
}
