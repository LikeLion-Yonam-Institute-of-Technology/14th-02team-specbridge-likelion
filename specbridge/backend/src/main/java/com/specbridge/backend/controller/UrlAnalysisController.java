package com.specbridge.backend.controller;

import com.specbridge.backend.dto.AnalyzeUrlRequest;
import com.specbridge.backend.dto.AnalyzeUrlResponse;
import com.specbridge.backend.service.UrlAnalysisService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

@RestController
@RequestMapping("/api/analyze-url")
@CrossOrigin(origins = "http://localhost:5173")
public class UrlAnalysisController {
    private final UrlAnalysisService urlAnalysisService;

    public UrlAnalysisController(UrlAnalysisService urlAnalysisService) {
        this.urlAnalysisService = urlAnalysisService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    public AnalyzeUrlResponse analyze(@RequestBody AnalyzeUrlRequest request) {
        if (request == null || request.url() == null || request.url().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "url은 필수입니다.");
        }
        try {
            return urlAnalysisService.analyze(request.url());
        } catch (IllegalArgumentException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, error.getMessage(), error);
        } catch (IOException error) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "웹페이지를 가져오지 못했습니다.", error);
        }
    }
}