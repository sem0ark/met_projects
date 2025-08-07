package com.it355.it355pz02;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@SpringBootApplication
@EnableMethodSecurity
public class It355pz02Application {

	public static void main(String[] args) {
		SpringApplication.run(It355pz02Application.class, args);
	}

}
