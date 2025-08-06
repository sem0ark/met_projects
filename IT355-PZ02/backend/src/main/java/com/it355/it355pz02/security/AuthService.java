package com.it355.it355pz02.security;

import com.it355.it355pz02.model.LoginDTO;
import com.it355.it355pz02.model.RegisterDTO;

public interface AuthService {
    String login(LoginDTO loginDto);
    String register(RegisterDTO registerDto);
}
