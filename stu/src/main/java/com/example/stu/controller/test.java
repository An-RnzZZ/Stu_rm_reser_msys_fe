package com.example.stu.controller;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
public class test {
    @GetMapping
    public String hello(){
        return "hello stu";
    }
}
