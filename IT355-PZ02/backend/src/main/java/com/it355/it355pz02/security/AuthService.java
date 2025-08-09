package com.it355.it355pz02.security;

import com.it355.it355pz02.controller.dto.LoginDTO;
import com.it355.it355pz02.controller.dto.UserPostDTO;

public interface AuthService {
    String login(LoginDTO loginDto);
    String register(UserPostDTO registerDto);
}
