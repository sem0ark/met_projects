package com.it355.it355pz02.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class JWTAuthResponseDTO {
   private String accessToken;
   private String tokenType = "Bearer";
   private String username;
   private User.Role role;
}
