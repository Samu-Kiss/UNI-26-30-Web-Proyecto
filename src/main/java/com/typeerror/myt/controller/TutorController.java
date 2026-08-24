package com.typeerror.myt.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.typeerror.myt.service.TutorService;

@Controller
@RequestMapping("/tutores")
public class TutorController {

    private final TutorService tutorService;

    @Autowired
    public TutorController(TutorService tutorService) {
        this.tutorService = tutorService;
    }

    @GetMapping
    public String listarTutores(Model model) {
        model.addAttribute("tutores", tutorService.findAll());
        return "tutores";
    }

}
